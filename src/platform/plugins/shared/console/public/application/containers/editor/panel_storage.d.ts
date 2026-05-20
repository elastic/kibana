export declare class PanelStorage {
    private readonly storage;
    private debouncedSave;
    getPanelSize(): [number, number];
    setPanelSize({ inputPanel, outputPanel }: {
        inputPanel: number;
        outputPanel: number;
    }): void;
}
