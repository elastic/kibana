---
id: kibBestPractices
slug: /kibana-dev-docs/contributing/best-practices
title: Best practices
description: Best practices to follow when building a Kibana plugin.
date: 2025-08-21
tags: ['kibana', 'onboarding', 'dev', 'architecture']
---

Comprehensive best practices for developing high-quality, secure, and maintainable Kibana plugins and features.

## Foundation Guidelines

**Required Reading:**
- [Development principles](dev_principles.mdx) - Core philosophy and architectural decisions
- [Standards and guidelines](standards.mdx) - Code quality and consistency standards
- [Documentation standards](documentation.mdx) - Writing effective technical documentation

## Code Quality and Architecture

### API Design Principles

**Minimize Public Surface Area:**
```typescript
// ✅ Good - minimal, focused API
export interface DataViewsService {
  get(id: string): Promise<DataView>;
  create(spec: DataViewSpec): Promise<DataView>;
}

// ❌ Bad - exposing internal implementation
export interface DataViewsService {
  get(id: string): Promise<DataView>;
  create(spec: DataViewSpec): Promise<DataView>;
  _internal_cache: Map<string, DataView>;  // Don't expose internals
  _validateSpec(spec: DataViewSpec): boolean;  // Don't expose helpers
}
```

**Use Plugin APIs Instead of Direct Access:**
```typescript
// ✅ Good - use plugin contract
const dataView = await dataViewStartContract.get(dataViewId);
const dataViews = await dataViewStartContract.getAll();

// ❌ Bad - bypassing plugin APIs
const dataView = await savedObjectsClient.get('data-view', dataViewId) as DataView;
```

### Package Organization

**Single Responsibility Principle:**
```typescript
// ✅ Good - focused package
@kbn/data-view-utils
├── src/
│   ├── validation.ts      // DataView validation only
│   ├── serialization.ts   // DataView serialization only
│   └── index.ts

// ❌ Bad - multiple responsibilities
@kbn/data-utils
├── src/
│   ├── dataViews.ts       // DataView utilities
│   ├── visualizations.ts  // Visualization utilities  
│   ├── dashboards.ts      // Dashboard utilities
│   └── authentication.ts // Unrelated functionality
```

**Package Breaking Guidelines:**
Break packages when:
- Different parts serve unrelated use cases
- Bundle size impact from unused imports
- Change frequency differs significantly between parts

**Migration Strategy:**
```typescript
// Use ESLint rule for automated migration
// .eslintrc.js
{
  "@kbn/imports/exports_moved_packages": [
    "error",
    {
      "from": "@kbn/old-package",
      "to": "@kbn/new-package", 
      "exports": ["specificFunction", "SpecificClass"]
    }
  ]
}
```

## Performance and Scalability

### Data Considerations

**Scale Testing Scenarios:**
```typescript
// Test with realistic data volumes
const testScenarios = {
  fields: {
    small: 50,      // Basic use case
    medium: 500,    // Typical enterprise
    large: 5000,    // High-cardinality datasets
    extreme: 50000  // Edge case handling
  },
  
  timeRange: {
    realtime: '1h',    // Live monitoring
    recent: '7d',      // Recent analysis  
    historical: '1y',  // Long-term trends
    massive: '5y'      // Full historical data
  },
  
  cardinality: {
    low: 100,       // Status fields, categories
    medium: 10000,  // User IDs, products
    high: 1000000   // IP addresses, unique events
  }
};
```

**Optimization Techniques:**
```typescript
// ✅ Good - efficient data handling
class DataProcessor {
  async processLargeDataset(query: Query) {
    // Use streaming for large datasets
    const stream = elasticsearch.search({ 
      ...query, 
      scroll: '1m',
      size: 1000 
    });
    
    // Process in chunks to avoid memory issues
    for await (const chunk of stream) {
      await this.processChunk(chunk);
    }
  }
  
  // Implement virtual scrolling for UI
  renderLargeList(items: Item[]) {
    return <VirtualizedList 
      items={items}
      itemHeight={50}
      windowSize={20} // Only render visible items
    />;
  }
}
```

**Performance Monitoring:**
```typescript
// Add performance markers
performance.mark('data-load-start');
const data = await loadData();
performance.mark('data-load-end');
performance.measure('data-load', 'data-load-start', 'data-load-end');

// Monitor bundle sizes
import(/* webpackChunkName: "heavy-feature" */ './heavyFeature');
```

### Network and Bandwidth Optimization

```typescript
// ✅ Optimize for slow connections
const searchConfig = {
  // Implement request debouncing
  debounceMs: 300,
  
  // Use compression
  compress: true,
  
  // Implement efficient caching
  cache: {
    ttl: 300000, // 5 minutes
    maxSize: 100 // Max cached queries
  },
  
  // Progressive loading
  pagination: {
    size: 25,
    loadMore: true
  }
};
```

## User Experience Standards

### Accessibility Implementation

**ARIA and Semantic HTML:**
```jsx
// ✅ Good - accessible form
<form role="search" aria-label="Data view search">
  <label htmlFor="query-input">Search data views</label>
  <input
    id="query-input"
    type="search"
    aria-describedby="search-help"
    aria-expanded={showSuggestions}
    aria-autocomplete="list"
  />
  <div id="search-help">
    Type to search across all available data views
  </div>
</form>

// ❌ Bad - inaccessible
<div onClick={search}>
  <input placeholder="Search..." />
</div>
```

**Keyboard Navigation:**
```typescript
// Implement proper focus management
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      focusNextItem();
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusPreviousItem();
      break;
    case 'Enter':
      event.preventDefault();
      selectCurrentItem();
      break;
    case 'Escape':
      event.preventDefault();
      closeSuggestions();
      break;
  }
};
```

**Testing Accessibility:**
```bash
# Install accessibility testing tools
yarn add --dev @axe-core/playwright

# Add to functional tests
await page.accessibility.scan();
```

### Internationalization (i18n)

**Text Externalization:**
```typescript
// ✅ Good - externalized strings
import { i18n } from '@kbn/i18n';

const strings = {
  searchPlaceholder: i18n.translate('myPlugin.search.placeholder', {
    defaultMessage: 'Search data views...',
    description: 'Placeholder text for data view search input'
  }),
  
  resultsCount: (count: number) => i18n.translate('myPlugin.search.resultsCount', {
    defaultMessage: '{count, plural, =0 {No results} one {# result} other {# results}}',
    values: { count },
    description: 'Count of search results displayed to user'
  })
};

// ❌ Bad - hardcoded strings
const placeholder = "Search data views...";
const resultsText = `${count} results found`;
```

**Date and Number Formatting:**
```typescript
import { getDateFormat, getNumberFormat } from '@kbn/ui-settings-browser';

// Use Kibana's formatting services
const formatDate = getDateFormat();
const formatNumber = getNumberFormat();

const displayDate = formatDate(timestamp);
const displayCount = formatNumber(count);
```

## Security Best Practices

### Input Validation and Sanitization

**Server-side Validation:**
```typescript
// ✅ Good - comprehensive validation
const schema = schema.object({
  query: schema.string({ 
    minLength: 1, 
    maxLength: 1000,
    validate: (value) => {
      // Prevent prototype pollution
      if (value.includes('__proto__') || value.includes('prototype.constructor')) {
        return 'Invalid query format';
      }
    }
  }),
  filters: schema.arrayOf(schema.object({
    field: schema.string(),
    value: schema.oneOf([schema.string(), schema.number()]),
    operator: schema.oneOf([schema.literal('eq'), schema.literal('neq')])
  }), { maxSize: 100 })
});

// Validate all route inputs
router.post({
  path: '/api/my-plugin/search',
  validate: { body: schema }
}, async (context, request, response) => {
  // Input is now validated and type-safe
});
```

**XSS Prevention:**
```typescript
// ✅ Good - safe content rendering
import { EuiText } from '@elastic/eui';
import DOMPurify from 'dompurify';

// Use React's built-in escaping
const SafeContent = ({ userInput }: { userInput: string }) => (
  <EuiText>{userInput}</EuiText> // Automatically escaped
);

// If HTML rendering is required, sanitize first
const SafeHTMLContent = ({ htmlContent }: { htmlContent: string }) => (
  <div dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: []
    })
  }} />
);
```

**URL Validation:**
```typescript
// ✅ Good - URL allowlist validation
const ALLOWED_DOMAINS = [
  'elastic.co',
  'elasticsearch.org',
  'kibana.dev'
];

const validateExternalURL = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
};

// Use for external redirects
if (validateExternalURL(redirectUrl)) {
  window.open(redirectUrl, '_blank', 'noopener,noreferrer');
}
```

### Authentication and Authorization

**Route Protection:**
```typescript
// Implement proper route guards
router.get({
  path: '/api/my-plugin/admin',
  validate: false
}, async (context, request, response) => {
  // Check user capabilities
  const { capabilities } = context.core;
  
  if (!capabilities.myPlugin?.admin) {
    return response.forbidden({
      body: 'Insufficient privileges for admin operations'
    });
  }
  
  // Proceed with admin logic
});
```

## Testing Standards

### Test Coverage Requirements

**Unit Testing:**
```typescript
// ✅ Comprehensive unit test coverage
describe('DataViewValidator', () => {
  it('validates required fields', () => {
    const result = validator.validate({});
    expect(result.errors).toContain('Name is required');
  });
  
  it('handles special characters in field names', () => {
    const spec = { name: 'test@field.name' };
    expect(validator.validate(spec).valid).toBe(true);
  });
  
  it('prevents prototype pollution attacks', () => {
    const maliciousSpec = { '__proto__': { admin: true } };
    expect(() => validator.validate(maliciousSpec)).toThrow();
  });
  
  // Test edge cases
  it('handles extremely long field names', () => {
    const longName = 'a'.repeat(10000);
    const result = validator.validate({ name: longName });
    expect(result.errors).toContain('Name too long');
  });
});
```

**Integration Testing:**
```typescript
// Test plugin interactions
describe('Data View Integration', () => {
  it('integrates with search plugin', async () => {
    const dataView = await dataViews.create(spec);
    const searchResponse = await search.search({
      index: dataView.title,
      query: { match_all: {} }
    });
    
    expect(searchResponse.hits.total).toBeGreaterThan(0);
  });
});
```

**Functional Testing:**
```typescript
// Test complete user workflows
export default function({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover']);
  
  describe('Data View Management', () => {
    it('creates and uses data view end-to-end', async () => {
      // Navigate to data view creation
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('dataViews');
      
      // Create data view
      await testSubjects.click('createDataViewButton');
      await testSubjects.setValue('createIndexPatternNameInput', 'test-*');
      await testSubjects.click('saveDataViewButton');
      
      // Verify creation and usage
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('test-*');
      
      expect(await testSubjects.exists('discoverDocTable')).toBe(true);
    });
  });
}
```

### Environment Testing

**Browser Compatibility:**
```javascript
// Test matrix configuration
const browsers = ['chrome', 'firefox', 'safari', 'edge'];
const viewports = [
  { width: 1920, height: 1080 }, // Desktop
  { width: 768, height: 1024 },  // Tablet
  { width: 375, height: 667 }    // Mobile
];

// Cross-browser test runner
browsers.forEach(browser => {
  viewports.forEach(viewport => {
    test(`${browser} - ${viewport.width}x${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      // Test responsive behavior
    });
  });
});
```

**Performance Testing:**
```typescript
// Load testing with realistic data volumes
test('handles large dataset efficiently', async () => {
  const startTime = performance.now();
  
  // Load 10,000 records
  const largeDataset = generateTestData(10000);
  await renderComponent({ data: largeDataset });
  
  const renderTime = performance.now() - startTime;
  expect(renderTime).toBeLessThan(1000); // Under 1 second
  
  // Check memory usage
  const memoryUsage = await page.evaluate(() => performance.memory.usedJSHeapSize);
  expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB
});
```

## Development Workflow

### Feature Development Strategy

**Incremental Development:**
```typescript
// Phase 1: Core functionality (MVP)
interface DataViewService {
  create(spec: DataViewSpec): Promise<DataView>;
  get(id: string): Promise<DataView>;
}

// Phase 2: Enhanced features
interface DataViewService {
  create(spec: DataViewSpec): Promise<DataView>;
  get(id: string): Promise<DataView>;
  search(query: string): Promise<DataView[]>;  // Added search
  validate(spec: DataViewSpec): ValidationResult; // Added validation
}

// Phase 3: Advanced features
interface DataViewService {
  // ... previous methods
  clone(id: string): Promise<DataView>;        // Added cloning
  export(ids: string[]): Promise<ExportResult>; // Added export
  import(file: File): Promise<ImportResult>;   // Added import
}
```

**Feature Flag Implementation:**
```typescript
// Feature flag configuration
export const FEATURE_FLAGS = {
  ADVANCED_DATA_VIEW_FEATURES: 'advancedDataViewFeatures',
  NEW_SEARCH_ALGORITHM: 'newSearchAlgorithm'
} as const;

// Usage in component
const MyComponent = () => {
  const features = useKibana().services.uiSettings.get('featureFlags');
  
  return (
    <div>
      {features[FEATURE_FLAGS.ADVANCED_DATA_VIEW_FEATURES] && (
        <AdvancedFeatures />
      )}
      
      <StandardFeatures />
    </div>
  );
};
```

### Code Review Checklist

**Before Submitting PR:**
- [ ] All tests pass locally
- [ ] Code follows style guide and linting rules
- [ ] Security considerations reviewed
- [ ] Performance impact assessed
- [ ] Accessibility standards met
- [ ] Browser compatibility verified
- [ ] Documentation updated

**PR Description Template:**
```markdown
## Summary
Brief description of changes and motivation.

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated  
- [ ] Functional tests added/updated
- [ ] Manual testing completed

## Security Review
- [ ] Input validation implemented
- [ ] Output sanitization verified
- [ ] Authentication/authorization checked
- [ ] No sensitive data exposed

## Performance Impact
- [ ] Bundle size impact measured
- [ ] Runtime performance tested
- [ ] Memory usage verified
- [ ] Database query efficiency checked
```

## Common Pitfalls and Solutions

### Anti-patterns to Avoid

**❌ Filesystem Storage:**
```typescript
// Don't store data in filesystem
import fs from 'fs';
fs.writeFileSync('/tmp/cache.json', data); // Ephemeral, unreliable
```

**❌ Server Memory State:**
```typescript
// Don't store state in server memory
let userSessions = new Map(); // Lost on restart, doesn't scale
```

**❌ WebSocket Usage:**
```typescript
// Don't use WebSockets without platform team approval
const socket = new WebSocket('ws://...'); // Breaks auth, load balancing
```

**✅ Correct Alternatives:**
```typescript
// Use saved objects for persistence
await savedObjects.create('my-plugin-data', data);

// Use browser storage for client state
localStorage.setItem('userPreferences', JSON.stringify(prefs));

// Use standard HTTP APIs
const eventSource = new EventSource('/api/my-plugin/events');
```

### Migration and Compatibility

**Saved Object Migrations:**
```typescript
const migrations = {
  '8.0.0': (doc: SavedObjectUnsanitizedDoc) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      // Migrate old format to new
      newField: convertOldField(doc.attributes.oldField),
      version: '8.0.0'
    }
  }),
  
  '8.5.0': (doc: SavedObjectUnsanitizedDoc) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      // Add new optional field
      optionalFeature: doc.attributes.optionalFeature ?? defaultValue
    }
  })
};
```

**URL State Migration:**
```typescript
// Version URL state for backward compatibility
const migrateUrlState = (state: any, version: string) => {
  if (semver.lt(version, '8.0.0')) {
    // Handle old URL format
    return {
      ...state,
      newFormat: convertOldFormat(state.oldFormat),
      version: '8.0.0'
    };
  }
  return state;
};
```

## Monitoring and Logging

**Effective Logging Strategy:**
```typescript
// ✅ Good - structured, actionable logging
logger.info('Data view created successfully', {
  dataViewId: dataView.id,
  title: dataView.title,
  fieldCount: dataView.fields.length,
  userId: request.auth.credentials?.username,
  duration: performance.now() - startTime
});

// ❌ Bad - sensitive data, not actionable
logger.info(`User ${user.email} created data view with query ${query}`);
```

**Performance Monitoring:**
```typescript
// Add telemetry for feature usage
analytics.reportEvent('dataViewCreated', {
  fieldCount: dataView.fields.length,
  hasTimeField: !!dataView.timeFieldName,
  patternType: getPatternType(dataView.title)
});
```

This comprehensive guide covers the essential practices for building robust, secure, and maintainable Kibana plugins. Regular review and updates ensure continued alignment with evolving platform capabilities and security requirements.