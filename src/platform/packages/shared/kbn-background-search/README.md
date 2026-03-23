# @kbn/background-search

## Summary

A tiny shared package that exposes the UI callout for Kibana's background search.

## Exports

- BackgroundSearchCallout: React component
  - Renders a small callout when a restored session is active (respecting the feature flag).

## Usage
1. Use the callout in any UI code:

```tsx
import { BackgroundSearchCallout } from '@kbn/background-search';

function MyComponent() {
  return (
    <div>
      <BackgroundSearchCallout state$={this.props.kibana.services.data.search.session.getState$} />
      {/* other UI */}
    </div>
  );
}
```
