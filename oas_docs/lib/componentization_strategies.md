# Summary
We’re looking at how we split OAS schemas into components. We test this using two real **kbn** APIs:

- **Simple**: `/api/actions/connector/{id}` GET  
- **Complex**: `/api/fleet/outputs` POST

The goal is to keep schemas **easy to read**, **easy to validate**, and **not full of useless components**.

---

## The 4 Decisions

When we componentize schemas, we always hit these questions:

1. **Primitives** – do we extract strings, numbers, booleans?
2. **Props in parents** – do extracted props stay in the parent?
3. **Metadata** – do we keep stuff like `description` and `additionalProperties`?
4. **Empty objects** – do we extract `{ type: object }` with no props?

---

## Recommended Answers (TL;DR)

✅ **Keep primitives inline**  
✅ **Keep extracted props in the parent**  
✅ **Preserve metadata**  
✅ **Skip empty objects**

---

## Why this works

- Schemas stay readable (less `$ref` hopping)
- Validation rules stay intact
- Component count stays sane
- Docs are easier for humans to understand

---

## The Final Strategy

```js
{
  extractPrimitives: false,
  removeProperties: false,
  preserveMetadata: true,
  extractEmpty: false
}
```

# Details

## Test APIs

We test against two real specs from **kbn**:

### 1. Simple schema

`/api/actions/connector/{id}` GET

Includes:
- Primitive fields (`id`, `name`, booleans)
- One empty object (`config`)
- Metadata (`description`, `additionalProperties`)
- `required` fields

Good for seeing how basic extraction behaves.

---

### 2. Complex schema

`/api/fleet/outputs` POST

Includes:
- Top-level `anyOf` (elasticsearch vs kafka)
- Nested objects (`secrets`, `ssl`, `shipper`)
- Nested `anyOf` (`secrets.ssl.key`)
- Up to 4 levels of nesting

This is where bad strategies get painful fast.

---

## Decision 1: Primitives

### Option: Extract primitives ❌

- One component per string/number/boolean
- Tons of tiny components
- Harder to read
- Reuse almost never helps

### Option: Keep inline ✅

- Fewer components
- Full shape visible in one place
- Easier to understand

**Verdict:** Keep primitives inline.

---

## Decision 2: Removing Props from Parents

### Option: Remove props ❌

- Parent schema looks incomplete
- You have to chase refs to understand shape

### Option: Keep props ✅

- Parent shows full interface
- Extracted objects are still reusable

**Verdict:** Keep props in the parent.

---

## Decision 3: Metadata

### Option: Strip metadata ❌

- Loses validation rules
- Loses descriptions
- Makes schemas misleading

### Option: Preserve metadata ✅

- Validation stays correct
- Docs stay useful

**Verdict:** Always preserve metadata.

---

## Decision 4: Empty Objects

### Option: Extract empty objects ❌

- More components
- More refs
- No real reuse value

### Option: Keep inline ✅

- Cleaner schema
- Less noise

**Verdict:** Skip empty objects.

---

## Simple vs Complex Impact

- **Simple schemas**:  
  Mostly affect component count

- **Complex schemas**:
  - Extracting primitives explodes components
  - Removing props makes nesting hard to follow
  - Metadata is critical for understanding validation
  - Skipping empty objects keeps things readable

---

## Final Recommendation (Again, for Emphasis)

```js
{
  extractPrimitives: false,
  removeProperties: false,
  preserveMetadata: true,
  extractEmpty: false
}
```

This combo keeps schemas readable, correct, and human-friendly.
