import { Event, pubsub } from "./pubsub";

interface ExecutionState {
  cancellationReason: string | null;
}
const state: ExecutionState = {
  cancellationReason: null,
};

export const setCancellationReason = (reason: string) => {
  if (state.cancellationReason) {
    return;
  }
  state.cancellationReason = reason;
  pubsub.emit(Event.RUN_CANCELLED, reason);
};

export const getCancellationReason = () => state.cancellationReason;
