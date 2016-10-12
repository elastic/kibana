import registerSimulate from './simulate';
import registerPipeline from './pipeline';
import registerPipelines from './pipelines';

export default function (server) {
  registerSimulate(server);
  registerPipeline(server);
  registerPipelines(server);
}
