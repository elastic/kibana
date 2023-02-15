import { ElasticAgentName, SynthtraceScenario } from '../typings';

export type Action = ToggletDistributedTracingAction | ChangeTopLevelServiceAction;

interface ToggletDistributedTracingAction {
  type: 'toggle_distributed_tracing';
  payload: { isDistributedTracing: SynthtraceScenario['isDistributedTracing'] };
}

interface ChangeTopLevelServiceAction {
  type: 'change_top_level_service';
  payload: { agentName: ElasticAgentName };
}
