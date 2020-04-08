def ant_task(*args, &block)
  task(*args) do |t|
    ant.define_tasks(&block)
  end
end

class FileList
  def to_str
    join(',')
  end
end
