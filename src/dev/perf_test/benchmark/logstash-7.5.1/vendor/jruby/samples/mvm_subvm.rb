require 'jruby/vm'

VM = JRuby::VM
ID = JRuby::VM_ID

# get the VM id of the parent
parent = VM.get_message

# get the VM id we're sending to
other = VM.get_message

VM.send_message(parent,
  "VM #{ID} starting up, sibling is: #{other}, parent is: #{parent}")

# loop until we receive nil, adding one and sending on
while message = VM.get_message
  break if message == "done"
  sleep 0.5
  new_message = message + 1
  VM.send_message(parent, 
    "VM #{JRuby::VM_ID} received: #{message}, sending #{new_message}")
  VM.send_message(other, message + 1)
end
VM.send_message(parent, 
  "VM #{JRuby::VM_ID} terminating")