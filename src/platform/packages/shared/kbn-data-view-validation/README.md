# @kbn/data-view-validation

Validation utilities for data views, including index pattern validation.

## Usage

```typescript
import { validateDataView, ILLEGAL_CHARACTERS_VISIBLE } from '@kbn/data-view-validation';

// Validate an index pattern
const errors = validateDataView('my-index-pattern');
if (errors.ILLEGAL_CHARACTERS) {
  console.log('Contains illegal characters:', errors.ILLEGAL_CHARACTERS);
}
if (errors.CONTAINS_SPACES) {
  console.log('Contains spaces');
}

// Check illegal characters list
console.log('Illegal characters:', ILLEGAL_CHARACTERS_VISIBLE);
```

## API

### `validateDataView(indexPattern: string)`

Returns an object with validation errors:
- `ILLEGAL_CHARACTERS`: Array of illegal characters found
- `CONTAINS_SPACES`: Boolean indicating if the pattern contains spaces

### Constants

- `ILLEGAL_CHARACTERS_VISIBLE`: Array of visible illegal characters
- `ILLEGAL_CHARACTERS`: Array of all illegal characters (including space)
- `ILLEGAL_CHARACTERS_KEY`: Error key for illegal characters
- `CONTAINS_SPACES_KEY`: Error key for spaces