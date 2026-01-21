# Escenario Synthtrace para Monitorización de Elasticsearch

## ✅ Estado: Implementación Completa

Todos los archivos han sido creados, validados con ESLint y type-check exitosos.

## 📋 Resumen

He creado un escenario completo en synthtrace para generar datos de monitorización de Elasticsearch que replican la estructura necesaria para trabajar con tu query ES|QL.

## 🎯 Query ES|QL Original

```esql
FROM .monitoring-es-*
  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_byhtes) BY source_node.name
  | WHERE min_available_bytes = 107374182400
  | KEEP source_node.name, min_available_bytes
```

## 📁 Archivos Creados

### 1. Librería Base - Node Stats Support
**Ubicación:** `src/platform/packages/shared/kbn-synthtrace-client/src/lib/monitoring/node_stats.ts`

Esta es la clase base que permite generar documentos `node_stats` con todos los campos necesarios:
- Información del nodo (name, uuid, transport_address)
- Estadísticas de filesystem (available_bytes, total_bytes)
- CPU y memoria JVM
- Estadísticas de índices

**Nota:** Incluye el campo con el typo `available_in_byhtes` para compatibilidad con la query.

### 2. Escenario de Synthtrace
**Ubicación:** `src/platform/packages/shared/kbn-synthtrace/src/scenarios/elasticsearch_node_stats_monitoring.ts`

Genera datos para 6 nodos (3 hot + 3 cold) con diferentes escenarios:
- ✅ **es-node-hot-1**: 100GB constante (coincide con query)
- ✅ **es-node-hot-2**: Fluctúa 100-200GB (mínimo coincide)
- ❌ **es-node-hot-3**: 200GB constante (no coincide)
- ✅ **es-node-cold-1**: 100GB constante (coincide con query)
- ❌ **es-node-cold-2**: 50GB constante (no coincide)
- ✅ **es-node-cold-3**: Fluctúa 100-200GB (mínimo coincide)

### 3. Documentación
**Ubicación:** `src/platform/packages/shared/kbn-synthtrace/src/scenarios/elasticsearch_node_stats_monitoring_README.md`

Documentación completa con:
- Descripción del escenario
- Estructura de datos generados
- Ejemplos de uso
- Instrucciones de personalización

### 4. Script Standalone de Ejemplo
**Ubicación:** `examples/generate_es_monitoring_data.js`

Script ejecutable que genera e indexa los datos directamente en Elasticsearch sin necesidad de usar el CLI de synthtrace.

## 🚀 Formas de Usar

### Opción 1: Ejecutar el Script Standalone (Más Rápido)

```bash
# Desde la raíz de Kibana
node examples/generate_es_monitoring_data.js

# Con configuración personalizada
ES_URL=http://localhost:9200 \
ES_USERNAME=elastic \
ES_PASSWORD=changeme \
node examples/generate_es_monitoring_data.js
```

### Opción 2: Usar el CLI de Synthtrace

```bash
# Desde la raíz de Kibana
node src/platform/packages/shared/kbn-synthtrace/bin/synthtrace \
  elasticsearch_node_stats_monitoring \
  --target http://localhost:9200 \
  --from now-1h \
  --to now
```

### Opción 3: Integrar en Tests Funcionales

```typescript
import { monitoring, timerange } from '@kbn/synthtrace-client';
import { nodeStats } from '@kbn/synthtrace-client/src/lib/monitoring/node_stats';

const from = Date.now() - 60 * 60 * 1000;
const to = Date.now();

const events = timerange(from, to)
  .interval('1m')
  .rate(1)
  .generator((timestamp) => {
    return nodeStats('es-node-hot-1', 'node-uuid', 'cluster-uuid')
      .timestamp(timestamp)
      .fsStats(107374182400, 536870912000) // 100GB available, 500GB total
      .cpuPercent(45)
      .jvmHeap(60, 4294967296)
      .indicesStats(1000000, 100000000000);
  });

await synthtraceEsClient.index(events);
```

## ✅ Verificación

Después de generar los datos, ejecuta la query en Kibana Dev Console:

```esql
FROM .monitoring-es-*
  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_byhtes) BY source_node.name
  | WHERE min_available_bytes = 107374182400
  | KEEP source_node.name, min_available_bytes
```

**Resultado esperado:**

| source_node.name  | min_available_bytes |
|-------------------|---------------------|
| es-node-hot-1     | 107374182400        |
| es-node-hot-2     | 107374182400        |
| es-node-cold-1    | 107374182400        |
| es-node-cold-3    | 107374182400        |

## 📊 Datos Generados

Cada documento incluye:

```json
{
  "@timestamp": "2026-01-20T...",
  "cluster_uuid": "...",
  "type": "node_stats",
  "source_node": {
    "uuid": "...",
    "name": "es-node-hot-1",
    "transport_address": "es-node-hot-1.elastic.local:9300"
  },
  "node_stats": {
    "node_id": "...",
    "fs": {
      "total": {
        "available_in_bytes": 107374182400,
        "available_in_byhtes": 107374182400,  // Typo intencional
        "total_in_bytes": 536870912000
      }
    },
    "process": {
      "cpu": {
        "percent": 45
      }
    },
    "jvm": {
      "mem": {
        "heap_used_percent": 60,
        "heap_max_in_bytes": 4294967296
      }
    },
    "indices": {
      "docs": {
        "count": 1250000
      },
      "store": {
        "size_in_bytes": 95000000000
      }
    }
  }
}
```

## 🧹 Limpieza

Para eliminar los datos generados:

```bash
# Eliminar el índice
curl -X DELETE "localhost:9200/.monitoring-es-*"
```

## 🔧 Personalización

Puedes modificar el escenario editando:
- `elasticsearch_node_stats_monitoring.ts` - Para cambiar nodos, valores, intervalos
- `node_stats.ts` - Para agregar más campos de métricas
- `generate_es_monitoring_data.js` - Para personalizar el script standalone

### Ejemplo: Agregar más nodos

```typescript
const nodes = [
  {
    name: 'es-node-hot-4',
    uuid: generateShortId(),
    tier: 'hot',
    availableBytes: GB_100,
    totalBytes: GB_500,
  },
  // ... más nodos
];
```

### Ejemplo: Cambiar el intervalo de generación

```typescript
.interval('30s') // Genera datos cada 30 segundos en lugar de cada minuto
```

## 💡 Casos de Uso

Este escenario es útil para:

1. **Pruebas de Alertas de Disco**: Simular nodos con poco espacio disponible
2. **Validación de Queries ES|QL**: Tener datos de prueba consistentes
3. **Tests de Stack Monitoring**: Probar funcionalidad de monitorización
4. **Desarrollo de Dashboards**: Datos realistas para visualizaciones
5. **Performance Testing**: Generar grandes volúmenes de datos de monitorización

## 🎓 Conceptos Clave

- **100 GB = 107374182400 bytes**: El valor filtrado en la query
- **Typo en el campo**: `available_in_byhtes` vs `available_in_bytes` - ambos se generan
- **Nodos Hot/Cold**: Diferentes tiers de almacenamiento en Elasticsearch
- **Variación temporal**: Algunos nodos fluctúan en espacio disponible para simular realidad
- **Índice de monitorización**: `.monitoring-es-*` es el patrón estándar de Stack Monitoring

## 📚 Referencias

- [Synthtrace Documentation](../README.md)
- [Elasticsearch Monitoring Docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/monitor-elasticsearch-cluster.html)
- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)

---

**¡Laboratorio listo para usar!** 🎉

Ahora tienes un entorno completo para experimentar con datos de monitorización de Elasticsearch de forma reproducible y controlada.
