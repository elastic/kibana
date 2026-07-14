export interface InferenceEndpointsAutocompleteResult {
    inferenceEndpoints: InferenceEndpointAutocompleteItem[];
}
export interface InferenceEndpointAutocompleteItem {
    inference_id: string;
    task_type: string;
}
