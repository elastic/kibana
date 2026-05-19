export interface Item {
    id: string;
    title: string;
    description?: string;
    tags: string[];
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
    managed?: boolean;
}
