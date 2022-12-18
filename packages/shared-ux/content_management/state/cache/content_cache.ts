import {CachedContentItem} from "./cached_content_item";
import {CachedContentType} from "./cached_content_type";
import type {ContentRegistry} from "../registry/content_registry";

export class ContentCache {
  protected readonly typeCache: Map<string, CachedContentType> = new Map();
  protected readonly itemCache: Map<string, CachedContentItem> = new Map();

  constructor(public readonly registry: ContentRegistry) {}

  public type(id: string): CachedContentType {
    let type = this.typeCache.get(id);
    if (!type) {
      type = new CachedContentType(id, this);
      this.typeCache.set(id, type);
    }
    return type;
  }

  public item(id: string, refreshIfNew: boolean = true): CachedContentItem {
    let item = this.itemCache.get(id);
    if (!item) {
      item = new CachedContentItem(id, this);
      if (refreshIfNew) item.refresh();
      this.itemCache.set(id, item);
    }
    return item;
  }
}
