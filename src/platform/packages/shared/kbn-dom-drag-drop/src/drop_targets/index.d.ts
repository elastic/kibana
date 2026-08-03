/**
 * Helpers for swap/duplicate/combine extra drops
 */
export declare const DropTargetSwapDuplicateCombine: {
    getCustomDropTarget: (dropType: import("..").DropType) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | null;
    getAdditionalClassesOnDroppable: (dropType?: string) => "domDroppable--incompatible" | undefined;
    getAdditionalClassesOnEnter: (dropType?: string) => "domDroppable--replacing" | undefined;
};
