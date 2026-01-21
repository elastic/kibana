# Escenario de Monitorización de Elasticsearch - Node Stats

## Descripción

Este escenario de synthtrace genera datos de monitorización de Elasticsearch que replican la estructura necesaria para trabajar con la siguiente query ES|QL:

```esql
FROM .monitoring-es-*
  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_byhtes) BY source_node.name
  | WHERE min_available_bytes = 107374182400
  | KEEP source_node.name, min_available_bytes
```

## Datos Generados

El escenario crea datos de `node_stats` para un cluster de Elasticsearch con 6 nodos:

### Nodos Hot Tier (3 nodos):
- **es-node-hot-1**: Tiene exactamente 100GB disponibles de forma constante ✓ (coincide con la query)
- **es-node-hot-2**: Fluctúa entre 100GB y 200GB (mínimo coincide con la query) ✓
- **es-node-hot-3**: Tiene 200GB disponibles (no coincide - más espacio)

### Nodos Cold Tier (3 nodos):
- **es-node-cold-1**: Tiene exactamente 100GB disponibles de forma constante ✓ (coincide con la query)
- **es-node-cold-2**: Tiene 50GB disponibles (no coincide - menos espacio)
- **es-node-cold-3**: Fluctúa entre 100GB y 200GB (mínimo coincide con la query) ✓

Los nodos que coinciden con el filtro `WHERE min_available_bytes = 107374182400` (100GB) son:
- es-node-hot-1
- es-node-hot-2
- es-node-cold-1
- es-node-cold-3

## Campos Generados

Cada documento `node_stats` incluye:

- `source_node.name`: Nombre del nodo (contiene "-hot-" o "-cold-")
- `source_node.uuid`: UUID del nodo
- `cluster_uuid`: UUID del cluster
- `node_stats.fs.total.available_in_bytes`: Espacio disponible en bytes
- `node_stats.fs.total.available_in_byhtes`: Espacio disponible (con el typo para compatibilidad con la query)
- `node_stats.fs.total.total_in_bytes`: Espacio total del disco
- `node_stats.process.cpu.percent`: Porcentaje de CPU usado
- `node_stats.jvm.mem.heap_used_percent`: Porcentaje de heap JVM usado
- `node_stats.jvm.mem.heap_max_in_bytes`: Tamaño máximo del heap
- `node_stats.indices.docs.count`: Número de documentos indexados
- `node_stats.indices.store.size_in_bytes`: Tamaño del almacenamiento

## Uso

### Opción 1: Ejecutar directamente con el CLI de synthtrace

```bash
# Desde la raíz del repositorio de Kibana
node src/platform/packages/shared/kbn-synthtrace/bin/synthtrace elasticsearch_node_stats_monitoring \
  --target http://localhost:9200 \
  --from now-1h \
  --to now
```

### Opción 2: Usar en tests funcionales

```typescript
import { monitoring, timerange } from '@kbn/synthtrace-client';
import { nodeStats } from '@kbn/synthtrace-client/src/lib/monitoring/node_stats';

// Generar datos para un nodo hot con 100GB disponibles
const events = timerange(from, to)
  .interval('1m')
  .rate(1)
  .generator((timestamp) => {
    return nodeStats('es-node-hot-1', 'node-uuid-1', 'cluster-uuid-1')
      .timestamp(timestamp)
      .fsStats(107374182400, 536870912000) // 100GB available, 500GB total
      .cpuPercent(45)
      .jvmHeap(60, 4294967296) // 60% used, 4GB max
      .indicesStats(1000000, 100000000000);
  });

// Indexar en Elasticsearch
await logsEsClient.index(events);
```

### Opción 3: Usar con Kibana Dev Console

Después de generar los datos, puedes ejecutar la query en Dev Console:

```esql
FROM .monitoring-es-*
  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_byhtes) BY source_node.name
  | WHERE min_available_bytes = 107374182400
  | KEEP source_node.name, min_available_bytes
```

Resultado esperado:
```
source_node.name     | min_available_bytes
---------------------|--------------------
es-node-hot-1        | 107374182400
es-node-hot-2        | 107374182400
es-node-cold-1       | 107374182400
es-node-cold-3       | 107374182400
```

## Personalización

Puedes modificar el escenario editando el archivo:
`src/platform/packages/shared/kbn-synthtrace/src/scenarios/elasticsearch_node_stats_monitoring.ts`

Parámetros personalizables:
- Nombres de los nodos
- Valores de espacio disponible
- Intervalo de generación de datos
- Rango de tiempo
- Métricas adicionales (CPU, memoria, etc.)

## Limpieza

Para eliminar los datos generados:

```bash
# Eliminar el índice de monitorización
curl -X DELETE "localhost:9200/.monitoring-es-*"
```

## Notas

- El escenario incluye el campo con el typo `available_in_byhtes` (en lugar de `available_in_bytes`) para mantener compatibilidad con la query original
- Los datos se generan con variación temporal realista para simular un entorno de producción
- El valor de 107374182400 bytes equivale exactamente a 100 GiB (gibibytes)
