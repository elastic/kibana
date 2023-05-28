import EventEmitter from "events";
export enum Event {
  RUN_CANCELLED = "runCancelled",
}
export const pubsub = new EventEmitter();
