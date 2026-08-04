import type { DropType } from '../types';
import type { HumanData } from '.';
type AnnouncementFunction = (draggedElement: HumanData, dropElement: HumanData) => string;
interface CustomAnnouncementsType {
    dropped: Partial<{
        [dropType in DropType]: AnnouncementFunction;
    }>;
    selectedTarget: Partial<{
        [dropType in DropType]: AnnouncementFunction;
    }>;
}
export declare const announcements: CustomAnnouncementsType;
export declare const announce: {
    dropped: (draggedElement: HumanData, dropElement: HumanData, type?: DropType) => string;
    selectedTarget: (draggedElement: HumanData, dropElement: HumanData, type?: DropType) => string;
    lifted: ({ label }: HumanData) => string;
    cancelled: ({ label, groupLabel, position }: HumanData) => string;
    noTarget: () => string;
};
export {};
