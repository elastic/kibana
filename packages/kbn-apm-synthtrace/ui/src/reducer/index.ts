import { SynthtraceScenario, Transaction } from '../typings';
import { Action } from './actions';
import { v4 as uuidv4 } from 'uuid';

export const INITIAL_STATE: SynthtraceScenario = {
  instanceName: 'instance_1',
  environment: 'production',
  isDistributedTracing: false,
};

export function reducer(state: SynthtraceScenario, action: Action): SynthtraceScenario {
  switch (action.type) {
    case 'toggle_distributed_tracing': {
      return {
        ...state,
        isDistributedTracing: action.payload.isDistributedTracing,
      };
    }
    case 'change_top_level_service': {
      const id = uuidv4();
      return {
        ...state,
        service: {
          agentName: action.payload.agentName,
          name: `synth-${action.payload.agentName}`,
          children: [{ name: 'tx1', serviceId: id, id: uuidv4() } as Transaction],
          id,
        },
      };
    }
  }
}
