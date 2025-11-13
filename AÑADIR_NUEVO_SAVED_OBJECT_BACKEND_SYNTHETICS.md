# Guía: Añadir un nuevo Saved Object en el backend de Synthetics

> **Objetivo:** Crear un nuevo tipo de Saved Object (por ejemplo `SyntheticsNotification`) en el plugin Synthetics (backend), incluyendo definición del tipo, registros, encriptación (si aplica), migraciones, helpers CRUD, rutas API HTTP, validación y verificación antes del commit.

---

## 1. Contexto rápido

El plugin Synthetics (backend) usa:
- **Saved Objects API** de Kibana Core para persistencia.
- **Encrypted Saved Objects Plugin** para campos sensibles (contraseñas, API keys).
- **Namespace types:** `single`, `multiple`, `agnostic` (según alcance del objeto).
- **Mappings dinámicos:** Normalmente `dynamic: false` para evitar explosión de campos.
- **Migrations:** Sistema de migraciones y model versions para evolucionar esquemas.
- **Routes REST API:** Exposición del CRUD a través de endpoints HTTP.
- **Validación:** Esquemas con `@kbn/config-schema`.

**Ubicación del código:**
- Tipos: `x-pack/solutions/observability/plugins/synthetics/server/saved_objects/`
- Rutas: `x-pack/solutions/observability/plugins/synthetics/server/routes/`
- Plugin setup: `x-pack/solutions/observability/plugins/synthetics/server/plugin.ts`

---

## 2. Preparativos y decisión del nombre

1. **Elige un nombre único** para el saved object type (ej.: `synthetics-notification`).
2. **Verifica que no exista:**
   ```bash
   grep -r "synthetics-notification" x-pack/solutions/observability/plugins/synthetics/
   ```
3. **Decide namespace type:**
   - `single`: Objeto vive en UN espacio Kibana (namespace-aware).
   - `multiple`: Objeto puede copiarse/compartirse entre espacios.
   - `agnostic`: Objeto global, no pertenece a ningún espacio (ej.: configuración global).
4. **Decide si necesita encriptación:**
   - Si almacena API keys, contraseñas, tokens → SÍ.
   - Si solo metadatos públicos → NO.
5. **Decide gestión:**
   - `importableAndExportable: true` → Permite import/export en UI de Saved Objects.
   - `hidden: true` → No aparece en UI de gestión.

---

## 3. Definir el tipo Saved Object

### 3.1 Crear archivo de definición

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/synthetics_notification.ts`

**Estructura base:**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { SavedObjectsType } from '@kbn/core/server';

// Nombre del tipo (debe ser único en toda la instancia Kibana)
export const syntheticsNotificationObjectType = 'synthetics-notification';

// Definición del tipo
export const syntheticsNotification: SavedObjectsType = {
  name: syntheticsNotificationObjectType,
  hidden: false, // true si no quieres que aparezca en UI de gestión
  namespaceType: 'multiple', // 'single' | 'multiple' | 'agnostic'
  mappings: {
    dynamic: false, // No indexar campos automáticamente
    properties: {
      // Solo definir campos que NECESITES buscar/filtrar
      // Ejemplo: si quieres buscar por 'enabled'
      enabled: {
        type: 'boolean',
      },
      name: {
        type: 'keyword', // Para búsquedas exactas
      },
      // El resto de campos se guardan pero no se indexan
      /* Campos no indexados (documentación):
         id: string;
         type: 'email' | 'slack' | 'webhook';
         config: object;
         webhookUrl?: string; // <- Será encriptado
         createdAt: string;
         updatedAt?: string;
      */
    },
  },
  management: {
    importableAndExportable: true, // Permite import/export
    icon: 'bell', // Icono EUI
    getTitle: (savedObject) =>
      savedObject.attributes.name ||
      i18n.translate('xpack.synthetics.notification.untitled', {
        defaultMessage: 'Untitled notification',
      }),
    // Opcional: onImport, onExport hooks
  },
  // Si necesitas migraciones (ver sección 6)
  // migrations: { ... }
  // modelVersions: { ... }
};
```

### 3.2 Definir tipo TypeScript para attributes

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/common/runtime_types/synthetics_notification.ts`

```typescript
export interface SyntheticsNotification {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook';
  enabled: boolean;
  config: {
    recipients?: string[];
    channel?: string;
    url?: string;
  };
  webhookUrl?: string; // Campo sensible (será encriptado)
  createdAt: string;
  updatedAt?: string;
}
```

---

## 4. Configurar encriptación (si aplica)

Si tu saved object tiene campos sensibles (contraseñas, tokens, API keys), **DEBES** usar Encrypted Saved Objects.

### 4.1 Definir configuración de encriptación

**En el mismo archivo del paso 3.1:**

```typescript
export const SYNTHETICS_NOTIFICATION_ENCRYPTED_TYPE = {
  type: syntheticsNotificationObjectType,
  attributesToEncrypt: new Set(['webhookUrl', 'config.apiKey']), // Campos a encriptar
  attributesToIncludeInAAD: new Set(['id', 'name', 'type']), // Additional Authenticated Data (para integridad)
};
```

**Qué encriptar:**
- Contraseñas, tokens, API keys, URLs con secretos.
- **NO** encriptar: nombres, IDs, metadatos públicos (reduce rendimiento).

---

## 5. Registrar el Saved Object en el plugin

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/saved_objects.ts`

### 5.1 Importar tu definición

```typescript
import {
  syntheticsNotification,
  SYNTHETICS_NOTIFICATION_ENCRYPTED_TYPE,
} from './synthetics_notification';
```

### 5.2 Registrar en la función `registerSyntheticsSavedObjects`

```typescript
export const registerSyntheticsSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  // ... registros existentes ...

  // Registrar tipo normal
  savedObjectsService.registerType(syntheticsNotification);

  // Si tiene encriptación, registrar también en plugin de encriptación
  encryptedSavedObjects.registerType(SYNTHETICS_NOTIFICATION_ENCRYPTED_TYPE);
};
```

**Orden:**
- Primero `savedObjectsService.registerType()` → Registra el tipo base.
- Luego `encryptedSavedObjects.registerType()` → Activa encriptación.

---

## 6. Migraciones (si evolucionas el esquema)

Si en futuras versiones cambias la estructura (añadir campos, renombrar, transformar datos), necesitas migraciones.

### 6.1 Migraciones legacy (hasta 8.8)

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/migrations/notifications/8.9.0.ts`

```typescript
import type { SavedObjectMigrationFn } from '@kbn/core/server';

export const migration890: SavedObjectMigrationFn<any, any> = (doc) => {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      // Añadir campo nuevo con valor por defecto
      enabled: doc.attributes.enabled ?? true,
    },
  };
};
```

**Registrar en el tipo:**

```typescript
export const syntheticsNotification: SavedObjectsType = {
  // ... campos anteriores ...
  migrations: {
    '8.9.0': migration890,
    '8.10.0': migration8100,
  },
};
```

### 6.2 Model Versions (recomendado desde 8.8+)

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/migrations/notifications/model_version_1.ts`

```typescript
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';

export const modelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'data_backfill',
      backfillFn: (doc) => {
        return {
          attributes: {
            enabled: true, // Valor por defecto para documentos viejos
          },
        };
      },
    },
  ],
};
```

**Registrar:**

```typescript
export const syntheticsNotification: SavedObjectsType = {
  // ... campos anteriores ...
  modelVersions: {
    1: modelVersion1,
    2: modelVersion2,
  },
};
```

**Tipos de cambios:**
- `data_backfill`: Añadir datos a docs existentes.
- `mappings_addition`: Nuevos campos en mappings.
- `mappings_deprecation`: Deprecar campos (no eliminar).

---

## 7. Helpers CRUD (opcional pero recomendado)

Crea funciones helper para encapsular la lógica de acceso.

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/synthetics_notification.ts`

```typescript
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

export const getSyntheticsNotification = async (
  client: SavedObjectsClientContract,
  id: string
): Promise<SyntheticsNotification | undefined> => {
  try {
    const obj = await client.get<SyntheticsNotification>(
      syntheticsNotificationObjectType,
      id
    );
    return obj?.attributes;
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return undefined;
    }
    throw getErr;
  }
};

export const getAllSyntheticsNotifications = async (
  client: SavedObjectsClientContract
): Promise<SyntheticsNotification[]> => {
  const result = await client.find<SyntheticsNotification>({
    type: syntheticsNotificationObjectType,
    perPage: 10000, // Ajustar según necesidad
  });
  return result.saved_objects.map((so) => ({
    id: so.id,
    ...so.attributes,
  }));
};

export const createSyntheticsNotification = async (
  client: SavedObjectsClientContract,
  notification: Omit<SyntheticsNotification, 'id' | 'createdAt'>
): Promise<SyntheticsNotification> => {
  const now = new Date().toISOString();
  const obj = await client.create<SyntheticsNotification>(
    syntheticsNotificationObjectType,
    {
      ...notification,
      createdAt: now,
    },
    {
      // id auto-generado o especificar: { id: 'custom-id' }
    }
  );
  return {
    id: obj.id,
    ...obj.attributes,
  };
};

export const updateSyntheticsNotification = async (
  client: SavedObjectsClientContract,
  id: string,
  updates: Partial<SyntheticsNotification>
): Promise<SyntheticsNotification> => {
  const obj = await client.update<SyntheticsNotification>(
    syntheticsNotificationObjectType,
    id,
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  );
  return {
    id: obj.id,
    ...obj.attributes,
  };
};

export const deleteSyntheticsNotification = async (
  client: SavedObjectsClientContract,
  id: string
): Promise<void> => {
  await client.delete(syntheticsNotificationObjectType, id);
};
```

---

## 8. Rutas API REST

Exponer endpoints HTTP para que el frontend (o API externa) pueda interactuar.

### 8.1 Crear archivo de rutas

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/routes/notifications/notifications.ts`

```typescript
import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../types';
import {
  getAllSyntheticsNotifications,
  getSyntheticsNotification,
  createSyntheticsNotification,
  updateSyntheticsNotification,
  deleteSyntheticsNotification,
} from '../../saved_objects/synthetics_notification';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

// GET /internal/synthetics/notifications
export const getSyntheticsNotificationsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.NOTIFICATIONS, // '/internal/synthetics/notifications'
  validate: false,
  handler: async ({ savedObjectsClient }) => {
    const notifications = await getAllSyntheticsNotifications(savedObjectsClient);
    return { notifications };
  },
});

// GET /internal/synthetics/notifications/{id}
export const getSyntheticsNotificationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: `${SYNTHETICS_API_URLS.NOTIFICATIONS}/{id}`,
  validate: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  handler: async ({ savedObjectsClient, request }) => {
    const { id } = request.params;
    const notification = await getSyntheticsNotification(savedObjectsClient, id);
    if (!notification) {
      return { statusCode: 404, body: { message: 'Notification not found' } };
    }
    return notification;
  },
});

// POST /internal/synthetics/notifications
export const createSyntheticsNotificationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.NOTIFICATIONS,
  validate: {
    body: schema.object({
      name: schema.string(),
      type: schema.oneOf([schema.literal('email'), schema.literal('slack'), schema.literal('webhook')]),
      enabled: schema.boolean({ defaultValue: true }),
      config: schema.object({
        recipients: schema.maybe(schema.arrayOf(schema.string())),
        channel: schema.maybe(schema.string()),
        url: schema.maybe(schema.string()),
      }),
      webhookUrl: schema.maybe(schema.string()),
    }),
  },
  writeAccess: true, // Indica operación de escritura
  handler: async ({ savedObjectsClient, request }) => {
    const notification = await createSyntheticsNotification(savedObjectsClient, request.body);
    return notification;
  },
});

// PUT /internal/synthetics/notifications/{id}
export const updateSyntheticsNotificationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: `${SYNTHETICS_API_URLS.NOTIFICATIONS}/{id}`,
  validate: {
    params: schema.object({
      id: schema.string(),
    }),
    body: schema.object({
      name: schema.maybe(schema.string()),
      enabled: schema.maybe(schema.boolean()),
      config: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request }) => {
    const { id } = request.params;
    const notification = await updateSyntheticsNotification(savedObjectsClient, id, request.body);
    return notification;
  },
});

// DELETE /internal/synthetics/notifications/{id}
export const deleteSyntheticsNotificationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: `${SYNTHETICS_API_URLS.NOTIFICATIONS}/{id}`,
  validate: {
    params: schema.object({
      id: schema.string(),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request }) => {
    const { id } = request.params;
    await deleteSyntheticsNotification(savedObjectsClient, id);
    return { success: true };
  },
});
```

### 8.2 Definir constante de URL

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/common/constants/api.ts` (o donde estén las URLs)

```typescript
export const SYNTHETICS_API_URLS = {
  // ... URLs existentes ...
  NOTIFICATIONS: '/internal/synthetics/notifications',
};
```

### 8.3 Registrar rutas en el servidor

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/routes/notifications/index.ts`

```typescript
import type { SyntheticsServerSetup } from '../../types';
import { createRouteWithAuth } from '../create_route_with_auth';
import {
  getSyntheticsNotificationsRoute,
  getSyntheticsNotificationRoute,
  createSyntheticsNotificationRoute,
  updateSyntheticsNotificationRoute,
  deleteSyntheticsNotificationRoute,
} from './notifications';

export const registerNotificationRoutes = (server: SyntheticsServerSetup) => {
  createRouteWithAuth(server, getSyntheticsNotificationsRoute());
  createRouteWithAuth(server, getSyntheticsNotificationRoute());
  createRouteWithAuth(server, createSyntheticsNotificationRoute());
  createRouteWithAuth(server, updateSyntheticsNotificationRoute());
  createRouteWithAuth(server, deleteSyntheticsNotificationRoute());
};
```

**Y en el archivo principal de rutas:**  
`x-pack/solutions/observability/plugins/synthetics/server/routes/index.ts`

```typescript
import { registerNotificationRoutes } from './notifications';

export const initSyntheticsRoutes = (server: SyntheticsServerSetup) => {
  // ... rutas existentes ...
  registerNotificationRoutes(server);
};
```

---

## 9. Tests

### 9.1 Unit tests del Saved Object

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/synthetics_notification.test.ts`

```typescript
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  getSyntheticsNotification,
  createSyntheticsNotification,
} from './synthetics_notification';

describe('SyntheticsNotification saved object helpers', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  it('should create notification', async () => {
    const mockNotification = {
      name: 'Test',
      type: 'email' as const,
      enabled: true,
      config: { recipients: ['test@example.com'] },
    };

    soClient.create.mockResolvedValue({
      id: 'test-id',
      type: 'synthetics-notification',
      attributes: { ...mockNotification, createdAt: '2025-01-01' },
      references: [],
    } as any);

    const result = await createSyntheticsNotification(soClient, mockNotification);

    expect(result.id).toBe('test-id');
    expect(result.name).toBe('Test');
    expect(soClient.create).toHaveBeenCalledWith(
      'synthetics-notification',
      expect.objectContaining({ name: 'Test' }),
      expect.any(Object)
    );
  });

  it('should return undefined for non-existent notification', async () => {
    soClient.get.mockRejectedValue(
      savedObjectsClientMock.createNotFoundError('synthetics-notification', 'missing-id')
    );

    const result = await getSyntheticsNotification(soClient, 'missing-id');
    expect(result).toBeUndefined();
  });
});
```

### 9.2 Integration tests de rutas

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/routes/notifications/notifications.test.ts`

```typescript
import { httpServerMock } from '@kbn/core/server/mocks';
import { createSyntheticsNotificationRoute } from './notifications';

describe('Notification routes', () => {
  it('validates request body for POST', () => {
    const route = createSyntheticsNotificationRoute();

    expect(() =>
      route.validate?.body?.validate({
        name: 'Test',
        type: 'email',
        enabled: true,
        config: {},
      })
    ).not.toThrow();

    expect(() =>
      route.validate?.body?.validate({
        // missing name
        type: 'email',
      })
    ).toThrow();
  });
});
```

### 9.3 Tests de migraciones

**Ubicación:**  
`x-pack/solutions/observability/plugins/synthetics/server/saved_objects/migrations/notifications/8.9.0.test.ts`

```typescript
import { migration890 } from './8.9.0';

describe('Notification migration 8.9.0', () => {
  it('should add enabled field with default true', () => {
    const doc = {
      id: '1',
      type: 'synthetics-notification',
      attributes: {
        name: 'Old notification',
      },
    } as any;

    const migrated = migration890(doc, {} as any);

    expect(migrated.attributes.enabled).toBe(true);
  });

  it('should preserve existing enabled value', () => {
    const doc = {
      id: '1',
      type: 'synthetics-notification',
      attributes: {
        name: 'Existing',
        enabled: false,
      },
    } as any;

    const migrated = migration890(doc, {} as any);

    expect(migrated.attributes.enabled).toBe(false);
  });
});
```

---

## 10. Verificación antes de cada commit

**Solo sobre archivos tocados:**

```bash
# Lint archivos cambiados
node scripts/eslint --fix $(git diff --name-only | grep -E '\.(ts|tsx)$')

# Type check del plugin Synthetics
node scripts/type_check --project x-pack/solutions/observability/plugins/synthetics/tsconfig.json

# Tests unitarios del plugin
yarn test:jest x-pack/solutions/observability/plugins/synthetics/server/saved_objects
yarn test:jest x-pack/solutions/observability/plugins/synthetics/server/routes/notifications
```

**Si añadiste tests de integración:**

```bash
yarn test:jest_integration x-pack/solutions/observability/plugins/synthetics/server/integration_tests
```

---

## 11. Buenas prácticas

### 11.1 Seguridad
- ✅ **Encripta SIEMPRE** contraseñas, tokens, API keys.
- ✅ **Valida input** en routes con `@kbn/config-schema`.
- ✅ **No expongas** saved objects encriptados directamente sin desencriptar en servidor.
- ✅ **Usa `writeAccess: true`** en routes que modifican datos.

### 11.2 Performance
- ✅ **`dynamic: false`** en mappings si no necesitas búsqueda full-text.
- ✅ **Solo indexa campos** que realmente filtrarás/buscarás.
- ✅ **Usa paginación** en `find()` (no `perPage: 10000` en producción).

### 11.3 Namespace awareness
- ✅ **`namespaceType: 'multiple'`** si quieres que usuarios compartan objetos entre espacios.
- ✅ **`namespaceType: 'single'`** para aislamiento por espacio (más común).
- ✅ **`namespaceType: 'agnostic'`** solo para configuración global única.

### 11.4 Migraciones
- ✅ **Nunca elimines campos** en migraciones (deprecar sí, eliminar no).
- ✅ **Provee valores por defecto** para campos nuevos.
- ✅ **Testa migraciones** con datos reales de versiones anteriores.

### 11.5 Importación/Exportación
- ✅ **`importableAndExportable: true`** si usuarios pueden mover configuración entre clusters.
- ✅ **Implementa hooks** `onImport`/`onExport` si necesitas transformar datos.

---

## 12. Checklist final

| Paso | Estado |
|------|--------|
| Tipo TypeScript definido en `common/runtime_types` | ⬜ |
| Saved Object type creado en `server/saved_objects/` | ⬜ |
| Encriptación configurada (si aplica) | ⬜ |
| Registrado en `registerSyntheticsSavedObjects()` | ⬜ |
| Helpers CRUD creados | ⬜ |
| Rutas API REST definidas y validadas | ⬜ |
| Constantes de URL añadidas | ⬜ |
| Rutas registradas en router | ⬜ |
| Tests unitarios de helpers | ⬜ |
| Tests de validación de rutas | ⬜ |
| Tests de migraciones (si aplica) | ⬜ |
| Lint sin errores | ⬜ |
| Type check sin errores | ⬜ |
| Tests pasan sin fallos | ⬜ |
| Commit con verificación documentada | ⬜ |

---

## 13. Ejemplo hilo completo (flujo CREATE)

### Frontend dispara:
```typescript
POST /internal/synthetics/notifications
{
  "name": "Slack Alert",
  "type": "slack",
  "enabled": true,
  "config": { "channel": "#alerts" },
  "webhookUrl": "https://hooks.slack.com/secret"
}
```

### Backend procesa:
1. **Route handler** valida esquema con `@kbn/config-schema`.
2. **Helper** `createSyntheticsNotification()` llama a `savedObjectsClient.create()`.
3. **Encrypted SO Plugin** encripta `webhookUrl` antes de guardar en Elasticsearch.
4. **Elasticsearch** persiste documento encriptado.
5. **Response** devuelve objeto creado (sin campo encriptado desencriptado).

### Frontend recibe:
```json
{
  "id": "abc-123",
  "name": "Slack Alert",
  "type": "slack",
  "enabled": true,
  "config": { "channel": "#alerts" },
  "createdAt": "2025-11-13T10:00:00Z"
}
```
(Nota: `webhookUrl` no se devuelve en respuesta por seguridad)

---

## 14. Trabajar con Encrypted Saved Objects

### Leer objeto encriptado (desencriptar):

```typescript
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

const getEncryptedClient = (server: SyntheticsServerSetup) => {
  return server.encryptedSavedObjects.getClient({
    includedHiddenTypes: [syntheticsNotificationObjectType],
  });
};

export const getSyntheticsNotificationDecrypted = async (
  server: SyntheticsServerSetup,
  id: string
): Promise<SyntheticsNotification> => {
  const encryptedClient = getEncryptedClient(server);
  const obj = await encryptedClient.getDecryptedAsInternalUser<SyntheticsNotification>(
    syntheticsNotificationObjectType,
    id
  );
  return obj.attributes;
};
```

**Cuándo desencriptar:**
- Al usar el webhook (enviar notificación).
- En operaciones internas del servidor.
- **NUNCA** exponer campo desencriptado en respuestas API públicas.

---

## 15. Migraciones avanzadas: Transformar datos

Si necesitas renombrar un campo:

```typescript
export const migration8100: SavedObjectMigrationFn<any, any> = (doc) => {
  const { oldFieldName, ...rest } = doc.attributes;
  return {
    ...doc,
    attributes: {
      ...rest,
      newFieldName: oldFieldName, // Renombrar
    },
  };
};
```

Si necesitas cambiar estructura:

```typescript
export const migration8110: SavedObjectMigrationFn<any, any> = (doc) => {
  // Antes: config era string, ahora es objeto
  const oldConfig = doc.attributes.config;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      config: typeof oldConfig === 'string' 
        ? { legacyValue: oldConfig } 
        : oldConfig,
    },
  };
};
```

---

## 16. Debugging común

### Error: "Unsupported saved object type"
- **Causa:** Tipo no registrado correctamente.
- **Fix:** Verificar que `registerSyntheticsSavedObjects()` se llama en `plugin.setup()`.

### Error: "Unable to decrypt attribute"
- **Causa:** Campo encriptado no se puede leer.
- **Fix:** Usar `encryptedSavedObjects.getClient()` con `getDecryptedAsInternalUser()`.

### Error: "Validation failed"
- **Causa:** Esquema de validación rechaza payload.
- **Fix:** Revisar schema en route y asegurar que coincide con tipo TS.

### Objetos no aparecen en Saved Objects UI
- **Causa:** `hidden: true` o `importableAndExportable: false`.
- **Fix:** Cambiar a `hidden: false` y `importableAndExportable: true`.

---

## 17. Opcionales avanzados

### Hooks de import/export

```typescript
export const syntheticsNotification: SavedObjectsType = {
  // ... campos base ...
  management: {
    importableAndExportable: true,
    onImport: (objects) => {
      // Transformar antes de importar
      return objects.map((obj) => ({
        ...obj,
        attributes: {
          ...obj.attributes,
          imported: true,
        },
      }));
    },
    onExport: (ctx, objects) => {
      // Transformar antes de exportar (ej.: eliminar campos sensibles)
      return objects.map((obj) => {
        const { webhookUrl, ...safeAttrs } = obj.attributes;
        return { ...obj, attributes: safeAttrs };
      });
    },
  },
};
```

### Relaciones entre Saved Objects

```typescript
// Al crear, añadir referencias
await client.create(
  syntheticsNotificationObjectType,
  notification,
  {
    references: [
      { type: 'synthetics-monitor', id: 'monitor-123', name: 'monitor' },
    ],
  }
);
```

### Bulk operations

```typescript
// Crear múltiples a la vez
const result = await client.bulkCreate([
  { type: syntheticsNotificationObjectType, attributes: notification1 },
  { type: syntheticsNotificationObjectType, attributes: notification2 },
]);

// Eliminar múltiples
await client.bulkDelete([
  { type: syntheticsNotificationObjectType, id: 'id1' },
  { type: syntheticsNotificationObjectType, id: 'id2' },
]);
```

---

## 18. Resumen final

Para añadir un nuevo Saved Object en Synthetics backend:

1. **Define tipo TS** en `common/runtime_types`.
2. **Crea SavedObjectsType** en `server/saved_objects/`.
3. **Configura encriptación** si tienes campos sensibles.
4. **Registra** en `registerSyntheticsSavedObjects()`.
5. **Crea helpers CRUD** para encapsular acceso.
6. **Define rutas API REST** con validación.
7. **Registra rutas** en router principal.
8. **Escribe tests** (helpers, routes, migraciones).
9. **Verifica** (lint, type check, tests) antes de commit.
10. **Documenta** uso interno si otros desarrolladores lo consumirán.

Mantén estricta tipificación, encriptación de campos sensibles, validación de input y cobertura de tests.

---

**¿Necesitas un ejemplo completo scaffolding de archivos para un saved object específico?** Dime el nombre y características y lo genero.
