export declare enum TypeStatus {
    Added = "added",
    Removed = "removed",
    Moved = "moved",
    Untouched = "untouched"
}
export interface TypeStatusDetails {
    currentIndex?: string;
    targetIndex?: string;
    status: TypeStatus;
}
export declare const ALLOWED_CONVERT_VERSION = "8.0.0";
