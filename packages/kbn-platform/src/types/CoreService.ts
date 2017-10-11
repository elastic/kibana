export interface CoreService {
  start(): Promise<void>;
  stop(): Promise<void>;
}
