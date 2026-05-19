export interface FilterItemActionsProps {
    disabled?: boolean;
    disableRemove?: boolean;
    onRemoveFilter: () => void;
    hideOr?: boolean;
    disableOr?: boolean;
    onOrButtonClick: () => void;
    hideAnd?: boolean;
    disableAnd?: boolean;
    onAddButtonClick: () => void;
}
