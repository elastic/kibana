# @kbn/web-worker-stub

Test stub for Web Worker functionality in Kibana test environments. This package provides a mock implementation of the Web Worker API for use in Jest tests where the native Worker API is not available.

## Overview

The `@kbn/web-worker-stub` package provides a minimal stub implementation of the Web Worker API for testing purposes. It automatically polyfills the global `Worker` constructor when it's not available (such as in Node.js test environments), enabling tests to run that depend on Web Worker functionality.

## Package Details

- **Package Type**: Development/testing utility
- **Purpose**: Test environment Web Worker polyfill
- **Dependencies**: Jest (for mock functions)
- **Auto-Loading**: Automatically stubs Worker when imported

## Core Functionality

### Automatic Worker Polyfill
When imported, this package automatically checks for the existence of `window.Worker` and provides a stub implementation if it's missing.

### Stubbed Worker Interface
The stub provides the essential Worker methods:
- `postMessage()` - Jest mock function for message posting
- `terminate()` - Jest mock function for worker termination

## Usage Examples

### Basic Test Setup
```typescript
// Import the stub to enable Web Worker functionality in tests
import '@kbn/web-worker-stub';

describe('Web Worker functionality', () => {
  it('should create and use a worker', () => {
    // Worker is now available in the test environment
    const worker = new Worker('worker-script.js');
    
    // Verify mock functions are called
    worker.postMessage({ type: 'start', data: 'test' });
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'start',
      data: 'test'
    });
    
    worker.terminate();
    expect(worker.terminate).toHaveBeenCalled();
  });
});
```

### Jest Setup File
```typescript
// In jest setup file (e.g., jest.setup.js)
import '@kbn/web-worker-stub';

// Now all tests have access to Worker functionality
```

### Testing Worker Communication
```typescript
import '@kbn/web-worker-stub';

describe('Worker communication', () => {
  let worker: Worker;
  
  beforeEach(() => {
    worker = new Worker('test-worker.js');
  });
  
  afterEach(() => {
    worker.terminate();
  });
  
  it('should send messages to worker', () => {
    const message = { command: 'process', data: [1, 2, 3] };
    
    worker.postMessage(message);
    
    expect(worker.postMessage).toHaveBeenCalledWith(message);
  });
  
  it('should terminate worker properly', () => {
    worker.terminate();
    
    expect(worker.terminate).toHaveBeenCalled();
  });
});
```

### Component Testing with Workers
```typescript
import '@kbn/web-worker-stub';
import { render } from '@testing-library/react';

describe('Component with Worker', () => {
  it('should create worker on mount', () => {
    const WorkerCreatedSpy = jest.spyOn(window, 'Worker');
    
    render(<ComponentThatUsesWorker />);
    
    expect(WorkerCreatedSpy).toHaveBeenCalledWith('background-processor.js');
  });
});
```

## Implementation Details

### Conditional Polyfill
The stub only activates when `window.Worker` is undefined, ensuring it doesn't interfere with actual Worker implementations in browser environments.

### Jest Mock Integration
Uses Jest's mocking system to provide trackable mock functions, enabling comprehensive testing of worker interactions.

### TypeScript Compatibility
Includes appropriate TypeScript annotations and type suppressions to work smoothly with TypeScript test suites.

## Browser vs. Test Environment

### Browser Environment
In actual browser environments where `window.Worker` exists, this package has no effect and doesn't override the native implementation.

### Test Environment (Node.js/Jest)
In Node.js-based test environments where `window.Worker` is undefined, the package provides the stub implementation to enable tests to run.

## Integration with Kibana Testing

### Test Configuration
This package is commonly imported in Jest setup files to ensure Worker functionality is available across all tests that might need it.

### Component Testing
Essential for testing React components and services that use Web Workers for background processing, data transformation, or parallel computation.

### Worker-Dependent Features
Enables testing of features that rely on Web Workers for:
- Background data processing
- File parsing and analysis
- Parallel computations
- Thread-safe operations

This package ensures that Worker-dependent code can be thoroughly tested in Kibana's Jest-based test suite, maintaining test coverage for features that use Web Workers while providing a consistent testing environment.
