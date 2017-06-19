export class Level {

  static Fatal = new Level('fatal', 1, 'red');
  static Error = new Level('error', 2, 'red');
  static Warn = new Level('warn', 3, 'yellow');
  static Info = new Level('info', 4);
  static Debug = new Level('debug', 5, 'green');
  static Trace = new Level('trace', 6, 'blue');

  constructor(
    readonly id: string,
    readonly value: number,
    readonly color?: string
  ) {}

  supports(level: Level) {
    return this.value >= level.value;
  }
}
