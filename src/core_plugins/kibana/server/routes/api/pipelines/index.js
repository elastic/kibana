import registerSimulate from './simulate';
import registerPipeline from './pipeline';
import registerPipelines from './pipelines';
import registerProcessors from './processors';

export default function (server) {
  registerSimulate(server);
  registerPipeline(server);
  registerPipelines(server);
  registerProcessors(server);
}
