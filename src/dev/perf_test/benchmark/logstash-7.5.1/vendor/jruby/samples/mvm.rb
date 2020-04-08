require 'jruby/vm'

# create the VMs
vm1 = JRuby::VM.spawn("-e", "load 'samples/mvm_subvm.rb'")
vm2 = JRuby::VM.spawn("-e", "load 'samples/mvm_subvm.rb'")

vm1.start
vm2.start

# connect them to parent
vm1 << JRuby::VM_ID
vm2 << JRuby::VM_ID

# connect them together
vm1 << vm2.id
vm2 << vm1.id

# start them running
vm1 << 1

# let them run for a while, reading their progress
run = true
Thread.new { while run; puts JRuby::VM.get_message; end }
sleep 20

# shut them down
run = false
vm1 << 'done'
vm2 << 'done'
vm1.join
vm2.join