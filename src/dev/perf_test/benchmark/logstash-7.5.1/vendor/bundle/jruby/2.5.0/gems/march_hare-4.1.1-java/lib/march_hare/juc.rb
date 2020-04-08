module MarchHare
  module JavaConcurrent
    java_import 'java.lang.Thread'
    java_import 'java.lang.Runnable'
    java_import 'java.lang.InterruptedException'
    include_package 'java.util.concurrent'
    include_package 'java.util.concurrent.atomic'
  end
end
