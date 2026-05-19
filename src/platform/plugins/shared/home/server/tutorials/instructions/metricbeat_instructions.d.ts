import type { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
export declare const createMetricbeatInstructions: ((context: TutorialContext) => {
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
}) & import("lodash").MemoizedFunction;
export declare const createMetricbeatCloudInstructions: (() => {
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
}) & import("lodash").MemoizedFunction;
export declare const createMetricbeatCloudInstructionsServerless: () => {
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
export declare function metricbeatEnableInstructions(moduleName: string): {
    OSX: {
        title: string;
        textPre: string;
        commands: string[];
        textPost: string;
    };
    DEB: {
        title: string;
        commands: string[];
        textPost: string;
    };
    RPM: {
        title: string;
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
export declare function metricbeatStatusCheck(moduleName: string): {
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
                        'event.module': string;
                    };
                };
            };
        };
    };
};
export declare function onPremInstructions(moduleName: string, context: TutorialContext): {
    instructionSets: {
        title: string;
        instructionVariants: {
            id: string;
            instructions: ({
                title: string;
                textPre: string;
                commands: string[];
            } | {
                title: string;
                commands: string[];
                textPost: string;
            })[];
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
                                'event.module': string;
                            };
                        };
                    };
                };
            };
        };
    }[];
};
export declare function onPremCloudInstructions(moduleName: string, context: TutorialContext): {
    instructionSets: {
        title: string;
        instructionVariants: {
            id: string;
            instructions: ({
                title: string;
                textPre: string;
            } | {
                title: string;
                commands: string[];
                textPost: string;
            })[];
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
                                'event.module': string;
                            };
                        };
                    };
                };
            };
        };
    }[];
};
export declare function cloudInstructions(moduleName: string, context: TutorialContext): {
    instructionSets: {
        title: string;
        instructionVariants: {
            id: string;
            instructions: ({
                title: string;
                textPre: string;
                commands: string[];
            } | {
                title: string;
                commands: string[];
                textPost: string;
            })[];
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
                                'event.module': string;
                            };
                        };
                    };
                };
            };
        };
    }[];
};
