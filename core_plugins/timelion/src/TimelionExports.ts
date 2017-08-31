export type TimelionFunction = () => void;

export interface TimelionExports {
  registerFunction: (pluginName: string, fn: TimelionFunction) => void;
}

export interface TimelionPluginType {
  timelion: TimelionExports;
}
