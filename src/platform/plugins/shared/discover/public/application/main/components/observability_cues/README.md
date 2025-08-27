# Span Overview Cue - POC

A lightweight cue system in Discover (Classic space view) that detects APM span data and encourages users to switch to the Observability solution view for enhanced trace visualization.

## Overview

This feature detects when the current Discover query returns APM span data and displays a contextual callout offering to switch to Observability view. It includes an onboarding modal that appears after switching to introduce users to trace-focused enhancements.

## Features

### Core Functionality
- **APM Span Detection**: Probes current Discover query for span data using DSL
- **Contextual Cue**: Shows callout only in Classic view when span data is detected
- **Solution Switching**: Seamlessly switches to Observability view preserving query state
- **Onboarding Modal**: Interactive tour of Observability features after switching
- **Flyout Banner**: Compact callout appears in document flyout when viewing span documents

### Gating Conditions
All conditions must be true for the cue to appear:
- Solution view is Classic (not Observability)
- Current query returns at least 1 hit matching APM span shape:
  - `processor.event: "span"`
  - `@timestamp` present
  - `trace.id` present  
  - `span.id` present
  - `span.duration.us` is numeric
- Data-stream identity present:
  - At least one hit has `data_stream.type: "traces"`
  - `_index` matches traces data stream pattern (`^(\.ds-)?traces-`)

### User Experience
- **Main Callout**: Full-featured callout in Discover main view
- **Compact Callout**: Streamlined banner in document flyout
- **Conditional Messaging**: Different copy for trial vs. non-trial deployments
- **Permission Gating**: Only shows for users with space management permissions
- **Dismissible**: In-memory dismissal for current session

## Implementation

### Files
- `span_overview_cue.tsx` - Main component with callout and modal
- `use_span_overview_probe.ts` - Hook for detecting span data
- `discover_grid_flyout.tsx` - Integration for flyout banner
- `doc_viewer_flyout.tsx` - Enhanced to support banner prop

### Key Components

#### SpanOverviewCue
- **Props**: `document?`, `variant?`, `hideFullCallout?`
- **Variants**: `'full'` (main view), `'compact'` (flyout banner)
- **Demo Controls**: Floating bar with toggles for testing

#### useSpanOverviewProbe
- **Background Query**: Minimal DSL probe for span detection
- **Performance**: Non-blocking, uses `searchSource.fetch$()`
- **Caching**: Results cached for current query context

#### Onboarding Modal
- **Interactive Tour**: 3 highlights with navigation
- **Persistence**: "Don't show again" preference in localStorage
- **Responsive**: Stacks on small screens

### Integration Points
- **Discover Layout**: Injected in main Discover view
- **Document Flyout**: Banner appears when viewing span documents
- **Solution Switching**: API call to update space settings
- **URL Parameters**: Triggers modal after solution switch

## Configuration

### Feature Flag
```typescript
xpack.discover.spanOverviewCue.enabled // default: true
```

### Demo Controls
Floating demo bar provides toggles for:
- **Can manage**: Space management permissions
- **Is trial**: Trial mode status  
- **Hide full**: Full callout visibility (full variant only)

## Future Considerations

### State Persistence
- **Callout State**: Remember if callout was open before switching views
- **Flyout State**: Keep flyout open after solution switch
- **Query Context**: Preserve exact Discover state across solution changes

### Enhanced Detection
- **Real-time Updates**: React to query changes without manual refresh
- **Advanced Patterns**: Support for custom span detection rules
- **Performance**: Optimize probe queries for large datasets

### User Experience
- **Progressive Disclosure**: Show different levels of detail based on user familiarity
- **Contextual Help**: Inline documentation and tooltips
- **A/B Testing**: Framework for testing different messaging approaches

### Technical Improvements
- **Type Safety**: Resolve remaining TypeScript/linting errors
- **Testing**: Unit tests for components and hooks
- **Telemetry**: Usage analytics and performance metrics
- **Accessibility**: Enhanced keyboard navigation and screen reader support

### Integration Opportunities
- **APM Plugin**: Direct integration with APM features
- **Observability**: Seamless handoff to Observability workflows
- **Search**: Enhanced search capabilities for trace data
- **Alerting**: Proactive notifications for trace-related insights

## Development Notes

### Current Limitations
- **POC Scope**: Focused on core functionality, some edge cases not handled
- **Type Safety**: Some TypeScript errors ignored for POC development
- **Testing**: No automated tests implemented yet
- **Performance**: Probe queries could be optimized for production

### Known Issues
- **DOM Nesting**: Warning when reusing callout component in flyout (resolved with separate implementation)
- **Service Access**: Some Kibana services may not be available in all contexts
- **State Management**: Callout state lost on page reload

### Debugging
- **Console Logs**: Debug statements present for development
- **Demo Bar**: Floating controls for testing different scenarios
- **React DevTools**: Recommended for inspecting component state

## Usage

### For Developers
1. Enable feature flag: `xpack.discover.spanOverviewCue.enabled: true`
2. Navigate to Discover in Classic view
3. Query for APM span data
4. Callout should appear if conditions are met
5. Use demo bar to test different scenarios

### For Testing
- **Span Detection**: Verify probe correctly identifies span documents
- **Solution Switching**: Test navigation to Observability view
- **Modal Tour**: Verify onboarding flow works correctly
- **Flyout Banner**: Test compact callout in document flyout
- **Permissions**: Test with different user permission levels

## Contributing

This is a POC implementation. For production use, consider:
- Adding comprehensive tests
- Resolving all TypeScript errors
- Implementing telemetry
- Adding accessibility features
- Optimizing performance
- Adding error handling
