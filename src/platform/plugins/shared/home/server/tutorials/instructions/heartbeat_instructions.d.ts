import type { Platform, TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
export declare const createHeartbeatInstructions: (context: TutorialContext) => {
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
export declare const createHeartbeatCloudInstructions: () => {
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
export declare const createHeartbeatCloudInstructionsServerless: () => {
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
export declare function heartbeatEnableInstructionsOnPrem(): {
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
export declare function heartbeatEnableInstructionsCloud(): {
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
export declare function heartbeatStatusCheck(): {
    title: string;
    text: string;
    btnLabel: string;
    success: string;
    error: string;
    esHitsCheck: {
        index: string;
        query: {
            match_all: {};
        };
    };
};
export declare function onPremInstructions(platforms: Platform[], context: TutorialContext): {
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
                    match_all: {};
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
                    match_all: {};
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
                    match_all: {};
                };
            };
        };
    }[];
};
