import {
  ElasticAgentName,
  SynthtraceScenario,
  ModalForm,
  Service,
  Span,
  Transaction,
  Credentials,
} from '../typings';

export type Action =
  | ToggletDistributedTracingAction
  | ChangeTopLevelServiceAction
  | ToggleModalAction
  | InsertNodeAction
  | InsertServiceAction
  | EditNodeAction
  | ToggleCleanApmIndicesAction
  | UpdateCredentialsAction
  | CleanScenarioAction;

interface ToggletDistributedTracingAction {
  type: 'toggle_distributed_tracing';
  payload: { isDistributedTracing: SynthtraceScenario['isDistributedTracing'] };
}

interface ChangeTopLevelServiceAction {
  type: 'change_top_level_service';
  payload: { agentName: ElasticAgentName };
}

interface ToggleModalAction {
  type: 'toggle_modal_form';
  payload: ModalForm;
}

interface InsertNodeAction {
  type: 'insert_node';
  payload: { id: string; node: Transaction | Span };
}

interface InsertServiceAction {
  type: 'insert_service';
  payload: { id: string; node: Transaction | Span; service: Service };
}

interface EditNodeAction {
  type: 'edit_node';
  payload: { id: string; node: Transaction | Span };
}

interface ToggleCleanApmIndicesAction {
  type: 'toggle_clean_apm_indices';
  payload: { cleanApmIndices: boolean };
}

interface UpdateCredentialsAction {
  type: 'update_credentials';
  payload: { credentials: Credentials };
}

interface CleanScenarioAction {
  type: 'clean_scenario';
}
