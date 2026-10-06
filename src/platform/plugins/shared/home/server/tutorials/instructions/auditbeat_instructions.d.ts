/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Platform,
  TutorialContext,
} from '../../services/tutorials/lib/tutorials_registry_types';
export declare const createAuditbeatInstructions: (context: TutorialContext) => {
  INSTALL: {
    OSX: {
      title: string;
      textPre: string;
      commands: string[];
    };
    DEB: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    RPM: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
  START: {
    OSX: {
      title: string;
      textPre: string;
      commands: string[];
    };
    DEB: {
      title: string;
      textPre: string;
      commands: string[];
    };
    RPM: {
      title: string;
      textPre: string;
      commands: string[];
    };
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
    };
  };
  CONFIG: {
    OSX: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    DEB: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    RPM: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
};
export declare const createAuditbeatCloudInstructions: () => {
  CONFIG: {
    OSX: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    DEB: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    RPM: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
};
export declare const createAuditbeatCloudInstructionsServerless: () => {
  CONFIG: {
    OSX: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    DEB: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    RPM: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
    WINDOWS: {
      title: string;
      textPre: string;
      commands: string[];
      textPost: string;
    };
  };
};
export declare function auditbeatStatusCheck(): {
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
export declare function onPremInstructions(
  platforms: readonly Platform[],
  context: TutorialContext
): {
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
export declare function onPremCloudInstructions(
  platforms: readonly Platform[],
  context: TutorialContext
): {
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
export declare function cloudInstructions(
  platforms: readonly Platform[],
  context: TutorialContext
): {
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
