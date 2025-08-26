# Tagging UI Plugin

## Overview

The `tagging-ui` plugin provides React UI components for tagging functionality in Kibana. It depends on `tagging-core` for the underlying tagging services.

## Architecture

This plugin is part of the tagging architecture breakdown that resolves circular dependencies:

```
tagging-ui -> tagging-core
home -> tagging-core + tagging-ui
```

## Components

### TagList
Basic component for displaying a list of tags.

### TagSelector
Component for selecting tags from available options.

### SavedObjectSaveModalTagSelector
Specialized tag selector for use in save modals (like Discover session save).

## Dependencies

- **Required Plugins**: `tagging-core`
- **Required Bundles**: None (minimal dependencies)

## Usage

```typescript
import { TagSelector, TagList } from '@kbn/tagging-ui';

// Use in components
<TagSelector 
  availableTags={tags}
  selectedTags={selectedTags}
  onChange={handleTagChange}
/>
```

## Integration with Home Plugin

The home plugin uses components from this plugin to provide tag selection UI in the "Tagged Items" panel, allowing users to filter and view saved objects by tags.

## Future Development

- Expand component library as needed
- Add more specialized tag selection components
- Improve accessibility and UX patterns
