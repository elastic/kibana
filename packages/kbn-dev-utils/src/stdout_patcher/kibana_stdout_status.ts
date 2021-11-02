/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { StatusRenderer } from './stdout_patcher';

export class KibanaStdoutStatus implements StatusRenderer {
  maxWidth = 30;
  state = new Map<string, string>();
  re = {
    optimizer: /\[@kbn\/optimizer\]\s+\[(\d+)\/(\d+)\]/,
    optimizerSuccess: /\[success\]\[@kbn\/optimizer\].*?/,
    kibanaServerRunning: /.*http\.server\.Kibana.*?http server running/,
    kibanaStatus: /.*?status.*?\sKibana\sis\snow\s(\w+)/,
  };

  constructor() {}

  render({ line, maxWidth }: { line: string; rawLine: string; maxWidth?: number }): string[] {
    this.maxWidth = maxWidth || this.maxWidth;
    this.state = this.parseLine(this.state, line);
    return [this.renderStatus(this.state), this.renderProgress(this.state)];
  }

  private renderStatus(parsed: Map<string, string>) {
    let kibanaStatus = parsed.get('kibanaStatus') || chalk.italic('unknown');
    if (kibanaStatus.includes('available')) {
      kibanaStatus = chalk.bgGreen.black(kibanaStatus);
    } else if (kibanaStatus.includes('degraded')) {
      kibanaStatus = chalk.bgRed.white(kibanaStatus);
    }
    return `Kibana status is ${kibanaStatus}`;
  }

  private renderProgress(parsed: Map<string, string>) {
    if (parsed.has('optimizerSuccess')) {
      return 'Optimizer completed. ✅';
    } else if (!parsed.has('totalBundles')) {
      return 'Optimizer: initializing...';
    } else {
      const current = parseInt(parsed.get('progressBundles') || '0', 10);
      const total = parseInt(parsed.get('totalBundles') || '0', 10);
      return 'Optimizer ⌛: ' + this.renderProgressBar({ current, total });
    }
  }

  private parseLine(currentParsed: Map<string, string>, line: string): Map<string, string> {
    let match;

    // optimizer finished
    match = this.re.optimizerSuccess.exec(line);
    if (match) {
      currentParsed.set('optimizerSuccess', '1');
      return currentParsed;
    }

    // optimizer progress
    match = this.re.optimizer.exec(line);
    if (match) {
      currentParsed.set('totalBundles', match[2]);
      currentParsed.set('progressBundles', match[1]);
      return currentParsed;
    }

    // kibana started running
    match = this.re.kibanaServerRunning.exec(line);
    if (match) {
      currentParsed.set('kibanaStatus', 'server running');
      return currentParsed;
    }

    match = this.re.kibanaStatus.exec(line);
    if (match) {
      currentParsed.set('kibanaStatus', match[1]);
      return currentParsed;
    }

    return currentParsed;
  }

  private renderProgressBar({ current, total }: { current: number; total: number }): string {
    let currentPercentage = 0;
    const totalPercentage = 100;

    // modify the left number to adjust the max cols in terminal
    const widthMultiplier = this.maxWidth / 2 / 100;

    if (total >= current) {
      currentPercentage = Math.floor((current * 100) / total);
    }

    const dots = '.'.repeat(currentPercentage * widthMultiplier);
    const empty = ' '.repeat((totalPercentage - currentPercentage) * widthMultiplier);

    return `${currentPercentage}% [${dots}${empty}] %`;
  }
}
