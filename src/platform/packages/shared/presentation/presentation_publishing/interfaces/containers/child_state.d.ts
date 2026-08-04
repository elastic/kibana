export interface HasSerializedChildState<SerializedState extends object = object> {
    getSerializedStateForChild: (childId: string) => SerializedState | undefined;
}
export declare const apiHasSerializedChildState: <SerializedState extends object = object>(api: unknown) => api is HasSerializedChildState<SerializedState>;
