# Entity Store API Routes

> All routes use snake_case. Constants in `common/index.ts` as `ENTITY_STORE_ROUTES`.
> Internal routes require headers: `kbn-xsrf: true`, `x-elastic-internal-origin: kibana`, `elastic-api-version: 2`.

## Lifecycle

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/security/entity_store/install` | Install entity store |
| POST | `/internal/security/entity_store/start` | Start/reschedule extraction tasks |
| POST | `/internal/security/entity_store/stop` | Stop extraction tasks |
| POST | `/internal/security/entity_store/uninstall` | Uninstall entity store |
| GET | `/internal/security/entity_store/status` | Status (`?include_components=true`) |

## CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/security/entity_store/entities/{entityType}` | Create entity (sync) |
| PUT | `/internal/security/entity_store/entities/{entityType}` | Update entity (sync) |
| PUT | `/internal/security/entity_store/entities/bulk` | Bulk upsert (async, writes to UPDATES data stream) |
| DELETE | `/internal/security/entity_store/entities/` | Delete entity by EUID |
| GET | `/internal/security/entity_store/entities` | List entities with filtering/pagination |

### CRUD Details

- **Create**: `esClient.index()` with `op_type: 'create'`, returns 409 on conflict
- **Update**: `esClient.update()` with `doc_as_upsert: false`, `retry_on_conflict: 3`
- **Bulk**: `esClient.bulk()` with `create` ops to UPDATES data stream (async)
- **Delete**: `esClient.delete()` on LATEST index by hashed EUID
- **`?force=true`** needed to update fields without `allowAPIUpdate: true`

## Resolution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/security/entity_store/resolution/link` | Link entities to target |
| POST | `/internal/security/entity_store/resolution/unlink` | Remove resolution links |
| GET | `/internal/security/entity_store/resolution/group` | Get resolution group |

## Configuration

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/internal/security/entity_store` | Update `logExtraction` config without reinstall |

## Entity Maintainers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/internal/security/entity_store/entity_maintainers` | List maintainers |
| PUT | `/internal/security/entity_store/entity_maintainers/start/{id}` | Start maintainer |
| PUT | `/internal/security/entity_store/entity_maintainers/stop/{id}` | Stop maintainer |
| PUT | `/internal/security/entity_store/entity_maintainers/run/{id}` | Run maintainer immediately |
| POST | `/internal/security/entity_store/entity_maintainers/init` | Initialize maintainers |

## Utility / Debugging

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/security/entity_store/check_privileges` | Check security privileges |
| POST | `/internal/security/entity_store/{entityType}/force_log_extraction` | Force manual extraction |
| POST | `/internal/security/entity_store/force_history_snapshot` | Force history snapshot |

## curl Examples

```bash
# Link entities
curl -s -X POST "http://localhost:5601/kbn/internal/security/entity_store/resolution/link" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2" \
  -d '{"target_id": "user:emily@okta", "entity_ids": ["user:echen@azure"]}'

# Unlink entities (non-aliases are silently skipped in response.skipped[])
curl -s -X POST "http://localhost:5601/kbn/internal/security/entity_store/resolution/unlink" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2" \
  -d '{"entity_ids": ["user:echen@azure"]}'

# Get resolution group
curl -s "http://localhost:5601/kbn/internal/security/entity_store/resolution/group?entity_id=user:emily@okta&apiVersion=2" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana"

# Get entity store status
curl -s "http://localhost:5601/kbn/internal/security/entity_store/status?include_components=true&apiVersion=2" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana"

# List maintainers
curl -s "http://localhost:5601/kbn/internal/security/entity_store/entity_maintainers?apiVersion=2" \
  -u elastic:changeme -H "x-elastic-internal-origin: kibana"

# Force extraction for a specific entity type
curl -s -X POST "http://localhost:5601/kbn/internal/security/entity_store/user/force_log_extraction" \
  -u elastic:changeme -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" -H "elastic-api-version: 2"
```
