// plugin.test.ts
import { CPSServerPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { registerRoutes } from './routes';

jest.mock('./routes', () => ({
  registerRoutes: jest.fn(),
}));

describe('CPSServerPlugin', () => {
  let plugin: CPSServerPlugin;
  let mockInitContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    mockInitContext = coreMock.createPluginInitializerContext();
    (mockInitContext.env.packageInfo as any).buildFlavor = 'serverless';
    mockCoreSetup = coreMock.createSetup();
    plugin = new CPSServerPlugin(mockInitContext);
  });

  it('should initialize the plugin', () => {
    expect(plugin).toBeDefined();
  });

  it('should expose getCpsEnabled method in setup', () => {
    const setup = plugin.setup(mockCoreSetup);
    expect(setup).toHaveProperty('getEnabled');
  });

  it('should register routes in serverless mode', () => {
    plugin.setup(mockCoreSetup);
    expect(registerRoutes).toHaveBeenCalled();
  });
});