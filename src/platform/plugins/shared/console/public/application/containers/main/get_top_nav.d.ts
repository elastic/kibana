interface Props {
    selectedTab: string;
    setSelectedTab: (id: string) => void;
}
export declare function getTopNavConfig({ selectedTab, setSelectedTab }: Props): {
    id: string;
    label: string;
    description: string;
    onClick: () => void;
    testId: string;
    isSelected: boolean;
    tourStep: number;
}[];
export {};
