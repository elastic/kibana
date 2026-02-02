# @kbn/tour-queue

# Tour Queue

A global queue mechanism for managing sequential tour display across Kibana plugins.

## API

### useTourQueue(tourId: TourId)

Hook that manages tour registration and state.

**Returns:**
- `isActive: boolean` - Whether this tour should be shown
- `onComplete: () => void` - Callback to mark tour as completed

### Tour Object Methods

When you register a tour, you get a tour object with these methods:

- `isActive()` - Check if this tour is currently active
- `complete()` - Mark tour as completed
- `skip()` - Skip all remaining tours for current page load
- `unregister()` - Remove tour from queue (cleanup)

### Tour Order

| Order | Tour ID | Description |
|----------|---------|-------------|
| 1 | `siemMigrationSetupTour` | Security SIEM migration setup (Security plugin) |

**Note:** Lower order = shown first. If a tour is skipped, all remaining tours are skipped for the current page load only.