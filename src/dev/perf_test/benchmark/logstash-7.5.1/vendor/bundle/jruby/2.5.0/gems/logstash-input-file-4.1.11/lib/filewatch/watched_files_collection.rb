# encoding: utf-8
module FileWatch
  class WatchedFilesCollection

    def initialize(settings)
      @sort_by = settings.file_sort_by # "last_modified" | "path"
      @sort_direction = settings.file_sort_direction # "asc" | "desc"
      @sort_method = method("#{@sort_by}_#{@sort_direction}".to_sym)
      @files = Concurrent::Array.new
      @pointers = Concurrent::Hash.new
    end

    def add(watched_file)
      @files << watched_file
      @sort_method.call
    end

    def delete(paths)
      Array(paths).each do |f|
        index = @pointers.delete(f)
        @files.delete_at(index)
      end
      @sort_method.call
    end

    def close_all
      @files.each(&:file_close)
    end

    def empty?
      @files.empty?
    end

    def keys
      @pointers.keys
    end

    def values
      @files
    end

    def watched_file_by_path(path)
      index = @pointers[path]
      return nil unless index
      @files[index]
    end

    private

    def last_modified_asc
      @files.sort! do |left, right|
        left.modified_at <=> right.modified_at
      end
      refresh_pointers
    end

    def last_modified_desc
      @files.sort! do |left, right|
        right.modified_at <=> left.modified_at
      end
      refresh_pointers
    end

    def path_asc
      @files.sort! do |left, right|
        left.path <=> right.path
      end
      refresh_pointers
    end

    def path_desc
      @files.sort! do |left, right|
        right.path <=> left.path
      end
      refresh_pointers
    end

    def refresh_pointers
      @files.each_with_index do |watched_file, index|
        @pointers[watched_file.path] = index
      end
    end
  end
end
