export function get(id: HTMLElement, doc?: Document): HTMLElement;
export function get(id: string, doc?: Document): HTMLElement;
export function get(id: any, doc?: Document): HTMLElement {
	if (typeof id !== 'string') {
		return id;
	}
	return (doc || document).getElementById(id);
}
