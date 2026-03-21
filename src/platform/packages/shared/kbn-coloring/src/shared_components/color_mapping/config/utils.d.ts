import type { Config, CategoricalConfig, GradientConfig, CategoricalColor, ColorCode } from './types';
export declare function isCategoricalColorConfig(config: Config): config is CategoricalConfig;
export declare function isGradientColorConfig(config: Config): config is GradientConfig;
export declare function getOtherAssignmentColor(specialAssignments: Config['specialAssignments'], assignments: Config['assignments']): {
    isLoop: true;
} | {
    isLoop: false;
    color: CategoricalColor | ColorCode;
};
