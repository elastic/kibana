export interface ReportClick {

}

export type Report = ReportClick;

export interface ReporterConfig {
  http: ReportHTTP;
  checkInterval?: number;
}

export interface ReportHTTP {
  (data: []): Promise<void>
}

export class Reporter {
  checkInterval: number;
  interval: any;
  http: ReportHTTP;

  constructor(config: ReporterConfig) {
    this.http =  config.http;
    this.checkInterval = config.checkInterval || 1000;
    this.interval = null;
  }

  start() {
    if (!this.interval) {
      this.interval = setInterval(() => this.report(), this.checkInterval);
    }
  }

  stop() {
    clearInterval(this.interval);
  }

  insertReport() {

  }

  async sendReports() {
    try {

      Promise.resolve(this.http())
    }
  }
}

export function createReporter(reportedConf: ReporterConfig): Reporter {
  const reporter = new Reporter(reportedConf);
  reporter.start();
  return reporter;
}
