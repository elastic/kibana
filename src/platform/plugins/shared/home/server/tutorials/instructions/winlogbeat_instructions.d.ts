/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
export declare const createWinlogbeatInstructions: (context: TutorialContext) => {
  INSTALL: {
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
  START: {
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
    };
  };
  CONFIG: {
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
};
export declare const createWinlogbeatCloudInstructions: () => {
  CONFIG: {
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
};
export declare const createWinlogbeatCloudInstructionsServerless: () => {
  CONFIG: {
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
};
export declare function winlogbeatStatusCheck(): {
  title: string;
  text: string;
  btnLabel: string;
  success: string;
  error: string;
  esHitsCheck: {
    index: string;
    query: {
      bool: {
        filter: {
          term: {
            'agent.type': string;
          };
        };
      };
    };
  };
};
export declare function onPremInstructions(context: TutorialContext): {
  instructionSets: {
    title: string;
    instructionVariants: {
      id: string;
      instructions: {
        title: string;
        textPre: string;
        commands: string[];
      }[];
    }[];
    statusCheck: {
      title: string;
      text: string;
      btnLabel: string;
      success: string;
      error: string;
      esHitsCheck: {
        index: string;
        query: {
          bool: {
            filter: {
              term: {
                'agent.type': string;
              };
            };
          };
        };
      };
    };
  }[];
};
export declare function onPremCloudInstructions(context: TutorialContext): {
  instructionSets: {
    title: string;
    instructionVariants: {
      id: string;
      instructions: {
        title: string;
        textPre: string;
      }[];
    }[];
    statusCheck: {
      title: string;
      text: string;
      btnLabel: string;
      success: string;
      error: string;
      esHitsCheck: {
        index: string;
        query: {
          bool: {
            filter: {
              term: {
                'agent.type': string;
              };
            };
          };
        };
      };
    };
  }[];
};
export declare function cloudInstructions(context: TutorialContext): {
  instructionSets: {
    title: string;
    instructionVariants: {
      id: string;
      instructions: {
        title: string;
        textPre: string;
        commands: string[];
      }[];
    }[];
    statusCheck: {
      title: string;
      text: string;
      btnLabel: string;
      success: string;
      error: string;
      esHitsCheck: {
        index: string;
        query: {
          bool: {
            filter: {
              term: {
                'agent.type': string;
              };
            };
          };
        };
      };
    };
  }[];
};
