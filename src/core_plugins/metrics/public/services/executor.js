import { uiModules } from 'ui/modules';
import executorProvider from './executor_provider';
const uiModule = uiModules.get('kibana/metrics_vis/executor', []);
uiModule.service('metricsExecutor', executorProvider);
