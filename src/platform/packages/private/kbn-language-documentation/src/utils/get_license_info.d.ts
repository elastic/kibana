import type { CommandDefinition, FunctionDefinition, MultipleLicenseInfo } from '../types';
export declare function getLicenseInfoForFunctions(fnDefinition: FunctionDefinition | undefined): MultipleLicenseInfo | undefined;
/**
 * Creates license info structure for commands.
 */
export declare function getLicenseInfoForCommand(commandDef: CommandDefinition | undefined): MultipleLicenseInfo | undefined;
