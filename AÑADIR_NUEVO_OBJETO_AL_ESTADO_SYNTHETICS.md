# Guía: Añadir un nuevo objeto al estado de la app Synthetics (Observability)

> **Objetivo:** Incorporar un nuevo tipo de entidad (por ejemplo `SyntheticsTag`) al estado global del plugin Synthetics, incluyendo definición de tipos, acciones, reducer, efectos (sagas), cliente API, selectores, pruebas y verificación previa al commit.

---

## 1. Contexto rápido

El plugin Synthetics usa:
- **Redux Toolkit + Redux‑Saga** (`function*` + `yield`) para efectos asíncronos.
- **Tipos compartidos** en `common/runtime_types`.
- **Patrones consistentes:** `actions.ts`, `api.ts`, `effects.ts`, `selectors.ts`.
- **Factories reutilizables** como `fetchEffectFactory` para reducir boilerplate.
- **Toasts** para feedback al usuario (`kibanaService.toasts`).
- **Verificación estricta** antes de cada commit (linting, type checking, tests).

---

## 2. Preparativos y decisión del nombre

1. **Elige un nombre coherente** y en singular para la entidad (ej.: `SyntheticsTag`).
2. **Verifica que no exista** algo similar:
   - Buscar en repo: `grep -i "SyntheticsTag"`
   - Revisar `x-pack/solutions/observability/plugins/synthetics/common/runtime_types`
3. **Decide si el objeto vive solo en frontend** o también se persiste en backend:
   - Si se persiste: necesitarás endpoint API nuevo (backend plugin).
   - Si solo es derivado/calculado: puede agregarse únicamente al store.

---

## 3. Definir/Extender tipos compartidos

**Ubicación típica para tipos compartidos:**  
`x-pack/solutions/observability/plugins/synthetics/common/runtime_types/`

**Pasos:**
1. Crear/editar archivo: `synthetics_tag.ts` (o similar).
2. Exportar tipo TS y runtime validator (si se usa io-ts o zod; adapta al estilo existente).
3. Re-exportar desde un índice si corresponde (ej.: `index.ts` en esa carpeta).
4. Mantener estricta tipificación (evitar `any`, `unknown` sin justificación).

**Ejemplo conceptual:**
```typescript
// common/runtime_types/synthetics_tag.ts
export interface SyntheticsTag {
  id: string;
  label: string;
  color?: string;
  createdAt: string; // ISO string
  updatedAt?: string;
}
```

---

## 4. Acciones Redux (Action Creators)

**Ubicación típica:**  
`public/apps/synthetics/state/<dominio>/actions.ts`

**Patrón recomendado** (similar a `fetchMonitorFiltersAction`):
1. Crear `createActionGroup` o acciones individuales (según estilo existente).
2. Nombrar con prefijo claro: `fetchSyntheticsTagsAction` para GET, `upsertSyntheticsTagAction` para crear/editar, etc.
3. Incluir variantes `.get`, `.success`, `.fail`.

**Ejemplo conceptual:**
```typescript
// actions.ts
export const fetchSyntheticsTagsAction = {
  get: createAction('[synthetics/tags] fetch get'),
  success: createAction<SyntheticsTag[]>('[synthetics/tags] fetch success'),
  fail: createAction<{ error: HttpError }>('[synthetics/tags] fetch fail'),
};
```

---

## 5. Reducer / Slice

**Ubicación:**  
`public/apps/synthetics/state/<dominio>/reducer.ts` o `slice.ts`

**Estructura de estado:**
```typescript
interface SyntheticsTagsState {
  items: SyntheticsTag[];
  loading: boolean;
  error?: string;
  lastUpdated?: number;
}
```

**Pasos:**
1. Inicializa estado.
2. Maneja acciones `.get` (pone `loading=true`), `.success` (guarda items), `.fail` (registra error).
3. Exporta el reducer y añade al root store donde se combinan reducers (revisar archivo donde se configura el store de Synthetics).

**Ejemplo conceptual:**
```typescript
const initialState: SyntheticsTagsState = {
  items: [],
  loading: false,
};

export const syntheticsTagsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchSyntheticsTagsAction.get, (state) => {
      state.loading = true;
      state.error = undefined;
    })
    .addCase(fetchSyntheticsTagsAction.success, (state, action) => {
      state.loading = false;
      state.items = action.payload;
      state.lastUpdated = Date.now();
    })
    .addCase(fetchSyntheticsTagsAction.fail, (state, action) => {
      state.loading = false;
      state.error = action.payload.error.message;
    });
});
```

**Integración en el store:**
- Localiza dónde se combinan reducers (p.ej. `public/apps/synthetics/state/store.ts`).
- Añade: `syntheticsTags: syntheticsTagsReducer`

---

## 6. Selectores

**Ubicación:**  
`public/apps/synthetics/state/<dominio>/selectors.ts`

Crea selectores memorizados si lo amerita (reselect), o simples si basta.

**Ejemplo:**
```typescript
export const selectSyntheticsTagsState = (root: RootState) => root.syntheticsTags;

export const selectTags = (root: RootState) => selectSyntheticsTagsState(root).items;
export const selectTagsLoading = (root: RootState) => selectSyntheticsTagsState(root).loading;
export const selectTagsError = (root: RootState) => selectSyntheticsTagsState(root).error;
```

---

## 7. Saga / Effect

**Ubicación:**  
`public/apps/synthetics/state/<dominio>/effects.ts`

**Patrón igual que `fetchMonitorFiltersEffect`** usando `takeLatest` + `fetchEffectFactory` si aplica.

**Ejemplo:**
```typescript
export function* fetchSyntheticsTagsEffect() {
  yield takeLatest(
    fetchSyntheticsTagsAction.get,
    fetchEffectFactory(
      fetchSyntheticsTagsApi,
      fetchSyntheticsTagsAction.success,
      fetchSyntheticsTagsAction.fail
    )
  );
}
```

**Registrar saga:**
- Busca el root saga (`effects.ts` global o una agregación).
- Añade el `fork(fetchSyntheticsTagsEffect)` si se usa `all([...])`.

**Edge cases a considerar:**
- Cancelación si se dispara múltiples veces rápido.
- Errores de red (mapearlos con `serializeHttpFetchError` si el proyecto lo usa).
- Vacíos (lista vacía) vs error → diferenciar.

---

## 8. Cliente API

**Ubicación típica:**  
`public/apps/synthetics/state/<dominio>/api.ts`

Implementa función que haga la llamada usando `kibanaService.http`:

```typescript
export async function fetchSyntheticsTagsApi(): Promise<SyntheticsTag[]> {
  // Ajustar path a tu endpoint real
  const res = await kibanaService.http.get<SyntheticsTag[]>('/internal/observability/synthetics/tags');
  return res;
}
```

**Si el backend no existe aún:**
1. Definir endpoint en plugin server side (en `server/routes/...` del plugin Synthetics).
2. Usar `router.get` con permisos y validaciones adecuadas.
3. Responder con arreglo de `SyntheticsTag` validado.

---

## 9. Integración en Componentes React

**Pasos:**
1. Despachar `fetchSyntheticsTagsAction.get()` en:
   - Un `useEffect` al montar un panel o
   - Cuando cambie un filtro dependiente.
2. Usar `useSelector(selectTags)` para la lista.
3. Mostrar estados:
   - `loading`: spinner/esqueleto.
   - `error`: mensaje con retry.
4. Añadir `data-test-subj` si se necesitan pruebas funcionales.

**Ejemplo:**
```tsx
const TagsPanel: React.FC = () => {
  const dispatch = useDispatch();
  const tags = useSelector(selectTags);
  const loading = useSelector(selectTagsLoading);
  const error = useSelector(selectTagsError);

  useEffect(() => {
    dispatch(fetchSyntheticsTagsAction.get());
  }, [dispatch]);

  if (loading) return <Spinner />;
  if (error) return <ErrorCallout message={error} />;

  return <TagsList items={tags} />;
};
```

---

## 10. Pruebas (Tests)

**Tipos de pruebas recomendadas:**

### 10.1 Unit tests de reducer
- Inicialización.
- `get` → estado loading.
- `success` → items poblados.
- `fail` → error.

### 10.2 Saga
- Paso a paso (usar `cloneableGenerator` si hay bifurcaciones).
- Verificar que produce `takeLatest` y luego `call`, `put`.

### 10.3 API mock
- Mock de `kibanaService.http.get`.

### 10.4 Componentes
- Render con lista vacía.
- Render con datos.
- Manejo de error.

**Ejemplo conceptual de test reducer:**
```typescript
it('sets loading on get', () => {
  const state = syntheticsTagsReducer(undefined, fetchSyntheticsTagsAction.get());
  expect(state.loading).toBe(true);
  expect(state.items).toHaveLength(0);
});
```

**Ejemplo saga (simplificado):**
```typescript
const gen = fetchSyntheticsTagsEffect();
const firstYield = gen.next().value;
// Esperar que sea un takeLatest con la acción y la factory
```

---

## 11. Verificación antes de cada commit

**Solo sobre archivos tocados:**

```bash
# Lint sólo archivos cambiados
node scripts/eslint --fix $(git diff --name-only)

# Type check pasando el tsconfig del plugin Synthetics
node scripts/type_check --project x-pack/solutions/observability/plugins/synthetics/tsconfig.json

# Tests unitarios afectados (ruta concreta)
yarn test:jest x-pack/solutions/observability/plugins/synthetics/public/apps/synthetics/state/tags
```

**Si agregaste tests FTR (funcionales):**
```bash
yarn test:ftr --config x-pack/solutions/observability/plugins/synthetics/test/functional/config.ts
```

---

## 12. Buenas prácticas y consistencia

- ✅ **Respetar nombres:** prefijo claro (`syntheticsTags`).
- ✅ **No introducir `any`** para salir del paso: refina tipos.
- ✅ **No eliminar tests** existentes sin reemplazo.
- ✅ **Usa `takeLatest`** para colecciones filtrables; `takeEvery` para operaciones atómicas (creación individual).
- ✅ **Evita duplicar lógica** de request; considera `fetchEffectFactory`.
- ✅ **Añade métricas/telemetría** si la entidad es relevante (revisar si el plugin ya tiene patrón).
- ✅ **Documenta en `dev_docs`** si la entidad es pública o clave para extensiones futuras.

---

## 13. Checklist final

| Paso | Estado |
|------|--------|
| Tipo definido en `common/runtime_types` | ⬜ |
| Acciones creadas (`get/success/fail`) | ⬜ |
| Reducer integrado en store | ⬜ |
| Selectores exportados | ⬜ |
| Saga registrada y funcionando | ⬜ |
| API client implementado | ⬜ |
| Componente React usa datos | ⬜ |
| Tests unitarios y saga agregados | ⬜ |
| Lint sin errores | ⬜ |
| Type check sin errores | ⬜ |
| Tests pasan sin fallos | ⬜ |
| Commit con verificación documentada | ⬜ |

---

## 14. Ejemplo hilo completo condensado (flujo GET)

### Flujo exitoso:
1. `dispatch(fetchSyntheticsTagsAction.get())`
2. Saga detecta la acción (`takeLatest`).
3. Saga ejecuta `call(fetchSyntheticsTagsApi)`.
4. Respuesta OK → `put(fetchSyntheticsTagsAction.success(tags))`.
5. Reducer guarda `items`, apaga `loading`.
6. Selectores exponen la lista.
7. UI se re-renderiza mostrando datos.

### Flujo con error:
1. Pasos 1–3 igual.
2. Falla en API → `put(fetchSyntheticsTagsAction.fail({ error }))`.
3. Reducer guarda mensaje de error.
4. UI muestra callout + botón retry.

---

## 15. Siguientes ampliaciones opcionales

- **Añadir paginación / filtros** → extender acciones con payload (ej. `{ page, perPage }`).
- **Cache TTL** → condicionar la saga a no refetch si `lastUpdated` es reciente.
- **Normalización** con `entityAdapter` de Redux Toolkit si colección crece.
- **Telemetría** de carga inicial y errores.
- **Feature flag** si es experimental (buscar cómo se gestionan en el plugin).

---

## 16. Resumen final

Para añadir un nuevo objeto al estado en Synthetics:

1. **Define el tipo** en `common/runtime_types`
2. **Crea acciones** Redux (get/success/fail)
3. **Implementa reducer** y selectores
4. **Desarrolla una saga** usando `fetchEffectFactory`
5. **Añade el cliente API**
6. **Integra en la UI** con hooks
7. **Cubre con pruebas** (reducer, saga, componentes)
8. **Pasa verificación estricta** (lint, tipos, tests) antes de cada commit

Mantén estilo, tipificación estricta y no sacrifiques cobertura.

---

**¿Necesitas scaffolding concreto de archivos reales para tu entidad?** Pídelo y lo preparo con nombres y rutas específicas.
