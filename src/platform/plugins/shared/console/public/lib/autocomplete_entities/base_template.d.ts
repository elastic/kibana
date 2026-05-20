export declare abstract class BaseTemplate<T> {
    protected templates: string[];
    abstract loadTemplates(templates: T): void;
    getTemplates: () => string[];
    clearTemplates: () => void;
}
