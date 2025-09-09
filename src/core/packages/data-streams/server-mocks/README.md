# @kbn/core-data-streams-server-mocks

Testing utilities and mocks for Kibana's core data streams server functionality. This package provides Jest mocks for the data streams service contracts, enabling effective unit testing of components that depend on data stream functionality.

## Overview

The `@kbn/core-data-streams-server-mocks` package provides comprehensive mock implementations for Kibana's core data streams server interfaces. It enables developers to write effective unit tests for code that depends on data stream functionality without requiring actual Elasticsearch integration.

## Package Details

- **Package Type**: `server-mocks` (testing utilities)
- **Owner**: `@elastic/kibana-core`
- **Purpose**: Testing support for data streams functionality
- **Dependencies**: `@kbn/core-data-streams-server`, `jest`

## Core Mock Services

### dataStreamServiceMock
Main mock factory providing both setup and start contract mocks for the data streams service.

#### Methods
- `createSetupContract()` - Creates a mocked DataStreamsSetup contract
- `createStartContract()` - Creates a mocked DataStreamsStart contract

## Mock Contracts

### DataStreamsSetup Mock
Mocked setup contract with the following Jest mock functions:
- `registerDataStream` - Mock for registering data stream definitions

### DataStreamsStart Mock  
Mocked start contract with the following Jest mock functions:
- `getClient` - Mock for getting the data streams client

## Usage Examples

### Basic Mock Setup
```typescript
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';

describe('MyDataStreamComponent', () => {
  let dataStreamsSetup: jest.Mocked<DataStreamsSetup>;
  let dataStreamsStart: jest.Mocked<DataStreamsStart>;
  
  beforeEach(() => {
    dataStreamsSetup = dataStreamServiceMock.createSetupContract();
    dataStreamsStart = dataStreamServiceMock.createStartContract();
  });
});
```

### Testing Data Stream Registration
```typescript
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';

describe('Plugin Setup', () => {
  it('should register data streams during setup', () => {
    const dataStreamsSetup = dataStreamServiceMock.createSetupContract();
    
    const myPlugin = new MyPlugin();
    myPlugin.setup({ dataStreams: dataStreamsSetup });
    
    expect(dataStreamsSetup.registerDataStream).toHaveBeenCalledWith({
      name: 'my-data-stream',
      template: expect.objectContaining({
        index_patterns: ['my-data-stream-*']
      })
    });
  });
});
```

### Testing Data Stream Client Usage
```typescript
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';

describe('Data Stream Service', () => {
  it('should use data stream client correctly', async () => {
    const dataStreamsStart = dataStreamServiceMock.createStartContract();
    const mockClient = { index: jest.fn() };
    dataStreamsStart.getClient.mockResolvedValue(mockClient);
    
    const service = new MyDataStreamService(dataStreamsStart);
    await service.indexDocument('my-stream', { message: 'test' });
    
    expect(dataStreamsStart.getClient).toHaveBeenCalled();
    expect(mockClient.index).toHaveBeenCalledWith({
      index: 'my-stream',
      body: { message: 'test' }
    });
  });
});
```

### Plugin Integration Testing
```typescript
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';

describe('Full Plugin Integration', () => {
  let plugin: MyPlugin;
  let dataStreamsSetup: jest.Mocked<DataStreamsSetup>;
  let dataStreamsStart: jest.Mocked<DataStreamsStart>;
  
  beforeEach(() => {
    dataStreamsSetup = dataStreamServiceMock.createSetupContract();
    dataStreamsStart = dataStreamServiceMock.createStartContract();
    plugin = new MyPlugin();
  });
  
  it('should setup and use data streams correctly', async () => {
    // Setup phase
    const setupResult = plugin.setup({
      dataStreams: dataStreamsSetup
    });
    
    // Start phase  
    const startResult = plugin.start({
      dataStreams: dataStreamsStart
    });
    
    // Verify registration
    expect(dataStreamsSetup.registerDataStream).toHaveBeenCalled();
    
    // Test runtime usage
    await startResult.processData({ test: 'data' });
    expect(dataStreamsStart.getClient).toHaveBeenCalled();
  });
});
```

### Custom Mock Implementations
```typescript
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';

describe('Advanced Testing', () => {
  it('should handle data stream errors', async () => {
    const dataStreamsStart = dataStreamServiceMock.createStartContract();
    
    // Customize mock behavior
    dataStreamsStart.getClient.mockRejectedValue(
      new Error('Data stream unavailable')
    );
    
    const service = new MyDataStreamService(dataStreamsStart);
    
    await expect(service.indexDocument('test', {}))
      .rejects.toThrow('Data stream unavailable');
  });
});
```

## Integration with Testing

This package is essential for testing any Kibana functionality that depends on data streams:

- **Plugin Testing**: Mock data stream dependencies in plugin unit tests
- **Integration Testing**: Test data stream interactions without Elasticsearch
- **Error Handling**: Test error scenarios and edge cases
- **Performance Testing**: Isolate data stream logic from external dependencies

The mocks provide a reliable foundation for testing data stream functionality, ensuring tests are fast, deterministic, and focused on the business logic rather than external infrastructure dependencies.
