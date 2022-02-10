/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function getExeFileName(exe: any, type: number) {
  if (exe.FileName === undefined) {
    return '';
  }
  if (exe.FileName !== '') {
    return exe.FileName;
  }
  switch (type) {
    case 0:
      return '<unsymbolized frame>';
    case 1:
      return 'Python';
    case 2:
      return 'PHP';
    case 3:
      return 'Native';
    case 4:
      return 'Kernel';
    case 5:
      return 'JVM/Hotspot';
    case 6:
      return 'Ruby';
    case 7:
      return 'Perl';
    case 8:
      return 'JavaScript';
    default:
      return '';
  }
}

function checkIfStringHasParentheses(s: string) {
  return /\(|\)/.test(s);
}

function getFunctionName(frame: any) {
  return frame.FunctionName !== '' && !checkIfStringHasParentheses(frame.FunctionName)
    ? `${frame.FunctionName}()`
    : frame.FunctionName;
}

// Generates the label for a flamegraph node
//
// This is slightly modified from the original code in elastic/prodfiler_ui
function getLabel(frame: any, executable: any, type: number) {
  if (frame.FunctionName !== '') {
    return `${getExeFileName(executable, type)}: ${getFunctionName(frame)} in #${frame.LineNumber}`;
  }
  return getExeFileName(executable, type);
}

export class FlameGraph {
  events: any;
  totalEvents: any;
  stacktraces: any;
  stackframes: any;
  executables: any;

  constructor(events: any, totalEvents: any, stackTraces: any, stackFrames: any, executables: any) {
    this.events = events;
    this.totalEvents = totalEvents;
    this.stacktraces = stackTraces;
    this.stackframes = stackFrames;
    this.executables = executables;
  }

  toElastic() {
    // Create a lookup table for stack frames with an appropriate default if
    // the corresponding metadata is missing
    const frameMap = new Map();
    for (let i = 0; i < this.stackframes.length; i++) {
      const frame = this.stackframes[i];
      if (frame.found) {
        frameMap.set(frame._id, frame._source);
      } else {
        frameMap.set(frame._id, {
          FunctionName: '',
          LineNumber: 0,
        });
      }
    }

    // Create a lookup table for executables with an appropriate default if
    // the corresponding metadata is missing
    const exeMap = new Map();
    for (let i = 0; i < this.executables.length; i++) {
      const exe = this.executables[i];
      if (exe.found) {
        exeMap.set(exe._id, exe._source);
      } else {
        exeMap.set(exe._id, {
          FileName: '',
        });
      }
    }

    let leaves = [];

    for (const trace of this.stacktraces) {
      if (trace.found) {
        const path = ['root'];
        for (let i = 0; i < trace._source.FrameID.length; i++) {
          const label = getLabel(
            frameMap.get(trace._source.FrameID[i]),
            exeMap.get(trace._source.FileID[i]),
            trace._source.Type[i]);
          if (label.length === 0) {
            path.push(trace._source.FrameID[i]);
          } else {
            path.push(label);
          }
        }
        const leaf = {
          id: path[path.length - 1],
          value: 1,
          depth: trace._source.FrameID.length,
          pathFromRoot: Object.fromEntries(path.map((item, i) => [i, item])),
        };
        leaves.push(leaf);
      }
    }

    return { leaves };
  }

  toPixi() {
    return {};
  }
}
