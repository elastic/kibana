import { ElasticAgentName, SynthtraceScenario, CreateModal } from '../typings';

export type Action =
  | ToggletDistributedTracingAction
  | ChangeTopLevelServiceAction
  | ToggleModalAction
  | InsertNodeAction;

interface ToggletDistributedTracingAction {
  type: 'toggle_distributed_tracing';
  payload: { isDistributedTracing: SynthtraceScenario['isDistributedTracing'] };
}

interface ChangeTopLevelServiceAction {
  type: 'change_top_level_service';
  payload: { agentName: ElasticAgentName };
}

interface ToggleModalAction {
  type: 'toggle_create_modal';
  payload: CreateModal;
}

interface InsertNodeAction {
  type: 'insert_node';
  payload: { id: string; node: any };
}
