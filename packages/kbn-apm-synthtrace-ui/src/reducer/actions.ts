import { ElasticAgentName, SynthtraceScenario, CreateModal, Service } from '../typings';

export type Action =
  | ToggletDistributedTracingAction
  | ChangeTopLevelServiceAction
  | ToggleModalAction
  | InsertNodeAction
  | InsertServiceAction;

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

interface InsertServiceAction {
  type: 'insert_service';
  payload: { id: string; node: any; service: Service };
}
