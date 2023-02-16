import {
  ElasticAgentName,
  SynthtraceScenario,
  CreateModal,
  Service,
  Span,
  Transaction,
} from '../typings';

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
  payload: { id: string; node: Transaction | Span };
}

interface InsertServiceAction {
  type: 'insert_service';
  payload: { id: string; node: Transaction | Span; service: Service };
}
