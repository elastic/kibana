import visDebugSpyPanelTemplate from './vis_debug_spy_panel.html';
import { SpyModesRegistryProvider } from 'ui/registry/spy_modes';

function VisDetailsSpyProvider() {
  return {
    name: 'debug',
    display: 'Debug',
    template: visDebugSpyPanelTemplate,
    order: 5
  };
}

// register the spy mode or it won't show up in the spys
SpyModesRegistryProvider.register(VisDetailsSpyProvider);
