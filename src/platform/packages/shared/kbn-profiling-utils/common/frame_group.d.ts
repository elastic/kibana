import type { StackFrameMetadata } from './profiling';
/** Frame group ID */
export type FrameGroupID = string;
/**
 *
 * createFrameGroupID is the "standard" way of grouping frames, by commonly shared group identifiers.
 * For ELF-symbolized frames, group by FunctionName, ExeFileName and FileID.
 * For non-symbolized frames, group by FileID and AddressOrLine.
 * otherwise group by ExeFileName, SourceFilename and FunctionName.
 * @param fileID string
 * @param addressOrLine string
 * @param exeFilename string
 * @param sourceFilename string
 * @param functionName string
 * @returns FrameGroupID
 */
export declare function createFrameGroupID(fileID: StackFrameMetadata['FileID'], addressOrLine: StackFrameMetadata['AddressOrLine'], exeFilename: StackFrameMetadata['ExeFileName'], sourceFilename: StackFrameMetadata['SourceFilename'], functionName: StackFrameMetadata['FunctionName']): FrameGroupID;
