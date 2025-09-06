### Basic nodejs usage


```javascript
  import { createSpecDefinitionsLoader } from 'one-console/server';

  // Super simple - just specify the version
  const loader = createSpecDefinitionsLoader('9.0', 'stack');
  const specs = loader.loadDefinitions();

  // Use in API route
  app.get('/api/console/spec_definitions', (req, res) => {
    res.json({ es: specs });
  });

```

### Advanced usage with custom environments

```javascript
  import { createSpecDefinitionsLoaderWithAdapter } from 'one-console/server';

  const customFs = { /* custom implementation */ };
  const loader = createSpecDefinitionsLoaderWithAdapter(
    '/custom/path',
    '9.0',
    customFs,
    'serverless'
  );
```